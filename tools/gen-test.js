'use strict';
// Testar bangeneratorn: node tools/gen-test.js
// Genererar 300 fängelsehålor + 75 banor per övrig biom (även träsket och frostfästet) + bossarenor av alla sorter (med och
// utan bosstema, även ishallen), validerar allt (rumstyper, vaktarens sal, fiendegrupper, rekvisita, fällor, valv med
// grindar/lås, farliga golv, nya fiender per biom och djup, specialrum, NPC:er, husdjursbur, drycker, istappar, nya vapen)
// och avslutar med exit 1 vid fel. Skriver statistik per biom.
// Version 6: vulkanen (75 banor) och obsidianhallen, Gen.secret (hemliga skattvåningar i alla utseenden), de nya tecknen
// (fiender Ñ Æ Þ Ð Ý, lägereld ¶, anslagstavla ®, tunnor µ ß, hemlig trappa ÷, runsten ª, kött ð, fällor ° ¬ ± ¨) bara där de
// får finnas, taken, och att smulande golv ¬ aldrig är enda vägen (¬ som vägg: P->x, Z och alla rum nås ändå).
// Version 7: gravkammaren (75 banor + 150 med spelets opts: seed RNG.hash(...), djup min(5, pos + varv), butik på position 2/4,
// vapen-id eller null, alla väktare inklusive flame och pharaoh), tempelhallen (bossarena 'tomb'), Gen.maze (labyrinter i alla
// utseenden), de nya tecknen (vapen ô û ï, fiender Ã Õ Ê Î Ô, sarkofag ², larmklocka ³, NPC:er ç ÿ ý, föremål þ ¼ ½, kvicksand ¯,
// rullstensutlösare ¹ med level.boulders, ljusschakt level.beams, väggar È Ì Ù) bara där de får finnas, taken, att kvicksanden
// aldrig är enda vägen (¯ som vägg) och att rullstenens korridor är rak och fri.
// Version 8: kristallgrottorna och den sjunkna staden (75 banor + 150 med spelets opts per biom), arenorna 'crystal' och 'sunken',
// väktarna crystalqueen och leviathan i alla biomer, de nya tecknen (vapen À Á Â, fiender Ë Í Ï Ó Ú Û Ā Ă, väggar Ą Ć Ĉ Ċ Č Ď, vatten Đ,
// spikar Ē, tidvatten Ĕ med level.tide, kristaller Ė Ę, vrakkistor Ě, luftbubblor Ĝ, kartografen Ğ, talangaltare Ġ, kunskapsböcker Ģ)
// bara där de får finnas, taken, att vatten/spikar/tidvatten aldrig är enda vägen (utom vattenskatten), ålar bara i vattnet, och
// frö-stabilitet: 300 banor med en gammal biom (och 300 utan opts.biome) jämförs med gen.js från version 7 (git-objektet GEN_V7_REF,
// eller filen i GEN_OLD): samma karta utom de nya sakerna ovanpå.
// Version 9: klocktornet och molnborgen (75 banor + 150 med spelets opts per biom, alla väktare inklusive clockmaker och thunderbird, alla
// vapen-id inklusive sawlauncher/windgun/spear), arenorna 'clock' och 'sky', väktarna i alla biomer, de nya tecknen (vapen Į į Ĳ, fiender
// ĳ Ĵ ĵ Ķ ķ ĸ, väggar Ĺ ĺ Ļ ļ Ľ ľ, sågspår Ŀ med level.saws, tidsbubblor ŀ, tomrum Ń, vindrutor ń med level.winds, urverk Ņ, blixtstänger ņ,
// klockspel Ň, molnkistor ň, kugghjul Ŋ, fjädrar ŋ) bara där de får finnas, taken, att sågspår/tidsbubblor aldrig är enda vägen och att allt
// nås utan att gå på tomrummet, Gen.secret/Gen.maze med de nya utseendena, negativa validate-tester, och frö-stabilitet mot version 8
// (git-objektet GEN_V8_REF eller filen i GEN_OLD8): samma karta utom kugghjul och fjädrar ovanpå.
// Version 10: de nya fienderna i de gamla biomerna (Ō ō Ŏ ŏ Ő ő: bara i sin biom och den närliggande, djup, tak, i stridsrum, grävaren aldrig
// intill vatten, rotvättar i grupper om 2-3, armborstskyttar helst vid skydd, paddjättar helst nära vatten) och legendaltaret Œ (högst 1, djup
// 2+, lugnt rum, fri framsida, nås med grindarna stängda, aldrig i arenor/hemliga våningar/labyrinter), frekvenser per biom (75 banor + 100
// med spelets opts per gammal biom), negativa validate-tester och frö-stabilitet mot version 9 (git-objektet GEN_V9_REF, gen.js i HEAD när
// version 10 skrevs, eller filen i GEN_OLD9): samma bana utom inbytta fiender och legendaltaret ovanpå.
// Version 11: svampriket och spegelpalatset (75 banor + 150 med spelets opts per biom: seed RNG.hash, djup min(5, pos + varv), butik på
// position 2/4, alla vapen-id inklusive sporelauncher/mirrorshield/whip, alla väktare inklusive mycelmother och mirrorking), arenorna 'fungus'
// och 'mirror', väktarna i alla biomer, de nya tecknen (vapen Ŕ ŕ Ŗ, fiender ŗ Ř ř Ś ś Ŝ, väggar ŝ Ş ş Š š Ţ, studsplattor ţ, sporpölar Ť,
// teleportrar ť med level.teleports, glödsvampar Ŧ, spegelstatyer ŧ, sporsäckar Ũ) bara där de får finnas, taken, att ţ/Ť/ť aldrig är enda
// vägen (som vägg nås allt ändå), spegelväggarnas andel (20-35 % av salarnas väggar, aldrig på dörrkarmar), sporlingar/glasskärvor i hela
// grupper, Gen.secret/Gen.maze med de nya utseendena, negativa validate-tester, och frö-stabilitet mot version 10 (git-objektet GEN_V10_REF,
// gen.js i HEAD när version 11 skrevs, eller filen i GEN_OLD10): banor med en gammal biom är samma bana med sporsäckar ovanpå; utan
// opts.biome ändras bara banorna som slår svampriket eller spegelpalatset; arenor, hemliga våningar och labyrinter är oförändrade.
// --show visar en bana per biom/arena.
const fs = require('fs');
const path = require('path');
global.window = global;
// eval i global scope så att window.RNG / window.Gen hamnar på global
(0, eval)(fs.readFileSync(path.join(__dirname, '..', 'js', 'rng.js'), 'utf8'));
// version 7 av generatorn (för frö-stabiliteten): GEN_OLD=sökväg, annars ur git (commit där gen.js senast var version 7)
const GEN_V7_REF = process.env.GEN_V7_REF || 'cf1ddaca4d35703316bf04aa9e2b4698611a1baa';
let OldGen = null, oldGenErr = '';
try {
  const src = process.env.GEN_OLD ? fs.readFileSync(process.env.GEN_OLD, 'utf8')
    : require('child_process').execFileSync('git', ['show', GEN_V7_REF + ':js/gen.js'], { cwd: path.join(__dirname, '..'), encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 1 << 26 });
  (0, eval)(src); OldGen = global.Gen; global.Gen = undefined;
} catch (e) { oldGenErr = String(e.message || e).split('\n')[0]; }
// version 8 av generatorn (för frö-stabiliteten i version 9): GEN_OLD8=sökväg, annars ur git (commit där gen.js senast var version 8)
const GEN_V8_REF = process.env.GEN_V8_REF || 'b0215efcf970293cc6bf8ced9043a202d12931dd';
let OldGen8 = null, oldGen8Err = '';
try {
  const src = process.env.GEN_OLD8 ? fs.readFileSync(process.env.GEN_OLD8, 'utf8')
    : require('child_process').execFileSync('git', ['show', GEN_V8_REF + ':js/gen.js'], { cwd: path.join(__dirname, '..'), encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 1 << 26 });
  (0, eval)(src); OldGen8 = global.Gen; global.Gen = undefined;
} catch (e) { oldGen8Err = String(e.message || e).split('\n')[0]; }
// version 9 av generatorn (för frö-stabiliteten i version 10): GEN_OLD9=sökväg, annars ur git (commit där gen.js senast var version 9, = HEAD
// när version 10 skrevs)
const GEN_V9_REF = process.env.GEN_V9_REF || '26ae0d512fd8ffd5a2300a35ff49fc2c49e28b00';
let OldGen9 = null, oldGen9Err = '';
try {
  const src = process.env.GEN_OLD9 ? fs.readFileSync(process.env.GEN_OLD9, 'utf8')
    : require('child_process').execFileSync('git', ['show', GEN_V9_REF + ':js/gen.js'], { cwd: path.join(__dirname, '..'), encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 1 << 26 });
  (0, eval)(src); OldGen9 = global.Gen; global.Gen = undefined;
} catch (e) { oldGen9Err = String(e.message || e).split('\n')[0]; }
// version 10 av generatorn (för frö-stabiliteten i version 11): GEN_OLD10=sökväg, annars ur git (commit där gen.js senast var version 10, = HEAD
// när version 11 skrevs)
const GEN_V10_REF = process.env.GEN_V10_REF || 'c2d78baa825b2ee05fbf7e4fbd4caf6bab3878a1';
let OldGen10 = null, oldGen10Err = '';
try {
  const src = process.env.GEN_OLD10 ? fs.readFileSync(process.env.GEN_OLD10, 'utf8')
    : require('child_process').execFileSync('git', ['show', GEN_V10_REF + ':js/gen.js'], { cwd: path.join(__dirname, '..'), encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 1 << 26 });
  (0, eval)(src); OldGen10 = global.Gen; global.Gen = undefined;
} catch (e) { oldGen10Err = String(e.message || e).split('\n')[0]; }
(0, eval)(fs.readFileSync(path.join(__dirname, '..', 'js', 'gen.js'), 'utf8'));

let failures = 0;
const fail = msg => { failures++; if (failures <= 25) console.log('FEL: ' + msg); };
const count = (map, ch) => map.reduce((n, r) => n + r.split(ch).length - 1, 0);
const isWall = c => (c >= '0' && c <= '9') || '#%~&=Ø¦Ò¤ÈÌÙĄĆĈĊČĎĹĺĻļĽľŝŞşŠšŢ'.includes(c);
const edgeC = c => isWall(c) || c === 'Ń'; // vägg eller tomrum (molnborgens ökant)
const INTERACT = '()[?;/', GATES = '|]{', DOORS = 'DG*|]{', NPCS = '£€©', V6BLOCK = '¶®÷µß', V7BLOCK = '²³çÿý', V8BLOCK = 'ĖĘĚĞĠ', V9BLOCK = 'ŅņŇň', V10BLOCK = 'Œ', V11BLOCK = 'Ŧŧ';
const isBlock = c => isWall(c) || ('fMtnkquvwyeHJT' + INTERACT + GATES + NPCS + V6BLOCK + V7BLOCK + V8BLOCK + V9BLOCK + V10BLOCK + V11BLOCK + 'Ń').includes(c);
const V10EN = 'ŌōŎŏŐő'; // version 10: fångvaktare, grävare, likgrävare, rotvätte, armborstskytt, paddjätte
const V11EN = 'ŗŘřŚśŜ'; // version 11: sporling, mycelbest, svampshaman, spegelriddare, illusionist, glasskärva
const NEW_EN = 'UXY!@^+ÅÄÖÉÜÑÆÞÐÝÃÕÊÎÔËÍÏÓÚÛĀĂĳĴĵĶķĸ' + V10EN + V11EN, OLD_EN = 'SKVILNORW', ENEMIES = OLD_EN + NEW_EN + 'EQ', PROPS = 'ckjquvwyzeiFHJT' + INTERACT + V6BLOCK + '²³ĖĘĚĠ' + V9BLOCK + V10BLOCK + V11BLOCK, LIGHTS = 'cfiFĘŅŦ';
const HAZ = '_-:"z<>Ç°¬±¨¯¹ĐĒĔĜĿŀŃńţŤť', LOOT = 'CAha$,¥ªþ¼½ĢŊŋŨ';
const SINK = '_z¬¯ĐĒĔĜÓĿŀţŤť'; // lava, spikar, smulande golv, kvicksand, djupt vatten, kristallspikar, tidvatten (och ålen i vattnet), sågspår, tidsbubblor, studsplattor, sporpölar, teleportrar: aldrig enda vägen
const WATER_LOOT = '$haĢ¥'; // vattenskatten: får nås bara simmande (även vrakkistan Ě)
const swimPass = c => !isBlock(c) && !'_z¬¯Ē'.includes(c); // simmande: vatten går bra, lava och spikar inte
const WCH = Object.keys(Gen.WEAPONS).join(''); // vapentecknen (g r m d b s p å ä ö)
const wchOf = w => (!w ? null : Gen.WEAPONS[w] ? w : [...WCH].find(c => Gen.WEAPONS[c] === w));
const SPECIAL = ['shop', 'shrine', 'treasure', 'secret', 'guardian', 'special', 'vault'];
// nya fiender: första djup och biomer där de får finnas
const NEW_DEPTH = { U: 1, X: 1, Y: 2, '^': 2, '+': 2, '!': 3, '@': 3, 'Å': 1, 'Ä': 2, 'Ö': 2, 'É': 1, 'Ü': 2, 'Ñ': 3, 'Æ': 2, 'Þ': 1, 'Ð': 3, 'Ý': 2,
  'Ã': 1, 'Õ': 1, 'Ê': 2, 'Î': 2, 'Ô': 3, 'Ë': 1, 'Í': 1, 'Ï': 1, 'Ó': 1, 'Ú': 2, 'Û': 1, 'Ā': 2, 'Ă': 3, 'ĳ': 1, 'Ĵ': 1, 'ĵ': 2, 'Ķ': 1, 'ķ': 2, 'ĸ': 3,
  'Ō': 1, 'ō': 2, 'Ŏ': 1, 'ŏ': 1, 'Ő': 1, 'ő': 2, 'ŗ': 1, 'Ř': 2, 'ř': 2, 'Ś': 1, 'ś': 2, 'Ŝ': 1 };
// version 7: tjuven Î och dubbelgångaren Ô i alla biomer, Õ i grottorna, Ã på kyrkogården, Ê på borggården, gravkammarens egna
// version 8: skuggjägaren Ā och häxan Ă i alla biomer, kristallgrottornas och sjunkna stadens egna
// version 10: Ō ō Ŏ ŏ Ő ő infödda i sin biom och sällsynta i den närliggande (V10_HOME / V10_NEAR)
const NEW_BIOME = { caves: 'UXÜÑÆÕÎÔĀĂō', forest: 'YUXÉÑÎÔĀĂŏő', graveyard: 'X!^ÅÄÖÑÐÝÃÎÔĀĂŎō', dungeon: '@!U+ÅÄÖÑÆÐÎÔĀĂŌŎŐ', courtyard: '@Y!ÄÖÑÐÊÎÔĀĂŐŌ', swamp: '^UYXÅÑÝÎÔĀĂőŏ', frost: 'ÉÜ@ÑÝÎÔĀĂ',
  volcano: 'YXÆ!ÑÐÞÎÔĀĂ', tomb: 'ÃÊXÕÎÔÑĀĂ', crystal: 'ËÍXÑÎÔĀĂ', sunken: 'ÏÓÚÛÑÎÔĀĂ', clock: 'ĳĴĵÑÎÔĀĂ', sky: 'ĶķĸÑÎÔĀĂ', // version 9: klocktornets och molnborgens egna
  fungus: '^UŗŘřÑÎÔĀĂ', mirror: '@ŚśŜÑÎÔĀĂ' }; // version 11: svamprikets och spegelpalatsets egna
const FEAT = { anvil: '(', fortune: ')', prisoner: '[', challenge: '?', offering: ';', lever: '/', locked: ']', cracked: '{', arrows: '<', gas: '>', lava: '_', water: '-', ice: ':', webs: '"',
  alchemist: '£', priest: '€', petcage: '©', potions: '¥', icicles: 'Ç',
  campfire: '¶', questboard: '®', runes: 'ª', meat: 'ð', firejets: '°', crumble: '¬', pendulums: '±', plates: '¨', secretstairs: '÷', poisonbarrels: 'µ', frostbarrels: 'ß',
  sarcophagi: '²', quicksand: '¯', boulders: '¹', bells: '³', gambler: 'ç', banker: 'ÿ', wanderer: 'ý', pages: 'þ', batteries: '¼', stones: '½',
  deepwater: 'Đ', crystalspikes: 'Ē', tide: 'Ĕ', breakcrystals: 'Ė', glowcrystals: 'Ę', wrecks: 'Ě', bubbles: 'Ĝ', cartographer: 'Ğ', talentaltar: 'Ġ',
  books: 'Ģ', stalker: 'Ā', witch: 'Ă', eels: 'Ó',
  saws: 'Ŀ', timebubbles: 'ŀ', void: 'Ń', winds: 'ń', clockworks: 'Ņ', lightningrods: 'ņ', chimes: 'Ň', cloudchests: 'ň', gears: 'Ŋ', feathers: 'ŋ',
  gearspiders: 'Ĵ', cloudgiants: 'ĸ',
  jailers: 'Ō', burrowers: 'ō', gravediggers: 'Ŏ', rootlings: 'ŏ', crossbowmen: 'Ő', toads: 'ő', legendaltar: 'Œ',
  bouncepads: 'ţ', sporepools: 'Ť', teleporters: 'ť', glowshrooms: 'Ŧ', mirrorstatues: 'ŧ', mirrorwalls: 'š', capwalls: 'Ş', sporesacks: 'Ũ',
  sporelings: 'ŗ', mycelbrutes: 'Ř', shamans: 'ř', mirrorknights: 'Ś', illusionists: 'ś', shardlings: 'Ŝ' };
const K11 = ['bouncepads', 'sporepools', 'teleporters', 'glowshrooms', 'mirrorstatues', 'mirrorwalls', 'capwalls', 'sporesacks', 'sporelings', 'mycelbrutes', 'shamans',
  'mirrorknights', 'illusionists', 'shardlings'];
const V11CAP = { 'Ř': 2, 'ś': 2, 'Ũ': 2, 'ţ': 4, 'Ť': 24, 'ť': 6 };
const K8 = ['deepwater', 'crystalspikes', 'tide', 'breakcrystals', 'glowcrystals', 'wrecks', 'bubbles', 'cartographer', 'talentaltar', 'books', 'stalker', 'witch', 'eels'];
const K9 = ['saws', 'timebubbles', 'void', 'winds', 'clockworks', 'lightningrods', 'chimes', 'cloudchests', 'gears', 'feathers', 'gearspiders', 'cloudgiants'];
const V9CAP = { 'Ŋ': 3, 'ŋ': 1, 'ŀ': 3, 'Ň': 1, 'ň': 3, 'ĸ': 2 };
const K10 = ['jailers', 'burrowers', 'gravediggers', 'rootlings', 'crossbowmen', 'toads', 'legendaltar'];
const V10CAP = { 'Ō': 4, 'ō': 4, 'Ŏ': 2, 'ŏ': 3, 'Ő': 4, 'ő': 2, 'Œ': 1 };
const V10_HOME = { 'Ō': 'dungeon', 'ō': 'caves', 'Ŏ': 'graveyard', 'ŏ': 'forest', 'Ő': 'courtyard', 'ő': 'swamp' };
const V10_NEAR = { 'Ō': 'courtyard', 'ō': 'graveyard', 'Ŏ': 'dungeon', 'ŏ': 'swamp', 'Ő': 'dungeon', 'ő': 'forest' };
const OLD6 = ['dungeon', 'caves', 'graveyard', 'forest', 'courtyard', 'swamp'];
const V8CAP = { 'Ā': 1, 'Ă': 1, 'Ğ': 1, 'Ġ': 1, 'Ģ': 2, 'Ė': 4, 'Ě': 3, 'Ē': 24, 'Ĕ': 48, 'Ĝ': 6, 'Ó': 4 };
const V7CAP = { '²': 5, '³': 1, 'ç': 1, 'ÿ': 1, 'ý': 1, 'þ': 1, '¼': 2, '½': 2, '¹': 1, '¯': 32, 'Î': 1, 'Ô': 1 };
const V6CAP = { '¶': 1, '®': 1, '÷': 1, 'ª': 1, 'ð': 2, '°': 4, '¬': 8, '±': 3, '¨': 2, 'Ñ': 2, 'Ð': 2 };
const SP_CH = { fortune: ')', challenge: '?', offering: ';', smithy: '(', alchemy: '£', chapel2: '€', camp: '¶' };
const GUARD = Gen.GUARDIANS, GUARD_IDS = Object.keys(GUARD);
const timed = f => { const t0 = process.hrtime.bigint(); const v = f(); return [v, Number(process.hrtime.bigint() - t0) / 1e6]; };
// flood fill från (sx, sy) med pass(tecken); returnerar avstånd (-1 = nås inte)
function floodD(m, sx, sy, pass) {
  const H = m.length, W = m[0].length, d = new Int32Array(W * H).fill(-1), q = [sy * W + sx]; d[q[0]] = 0;
  for (let qh = 0; qh < q.length; qh++) {
    const c = q[qh], x = c % W, y = (c / W) | 0;
    for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
      if (nx < 0 || ny < 0 || nx >= W || ny >= H || d[ny * W + nx] >= 0 || !pass(m[ny][nx])) continue;
      d[ny * W + nx] = d[c] + 1; q.push(ny * W + nx);
    }
  }
  return d;
}
const findCh = (m, ch) => { for (let y = 0; y < m.length; y++) { const x = m[y].indexOf(ch); if (x >= 0) return [x, y]; } return null; };
// BFS-avstånd från P till x (passerbart = allt som inte blockerar), -1 om det saknas väg
function pathPX(m) {
  const H = m.length, W = m[0].length;
  let s = -1, t = -1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { if (m[y][x] === 'P') s = y * W + x; if (m[y][x] === 'x') t = y * W + x; }
  const d = new Int32Array(W * H).fill(-1), q = [s]; d[s] = 0;
  for (let qh = 0; qh < q.length; qh++) {
    const c = q[qh], x = c % W, y = (c / W) | 0;
    for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
      if (nx < 0 || ny < 0 || nx >= W || ny >= H || d[ny * W + nx] >= 0 || isBlock(m[ny][nx])) continue;
      d[ny * W + nx] = d[c] + 1; q.push(ny * W + nx);
    }
  }
  return d[t];
}

// ---- RNG ----
{
  const a = RNG(42), b = RNG(42), c = RNG(43);
  const sa = Array.from({ length: 8 }, () => a.next()), sb = Array.from({ length: 8 }, () => b.next()), sc = Array.from({ length: 8 }, () => c.next());
  if (JSON.stringify(sa) !== JSON.stringify(sb)) fail('RNG: samma seed gav olika sekvens');
  if (JSON.stringify(sa) === JSON.stringify(sc)) fail('RNG: olika seeds gav samma sekvens');
  const r = RNG('hej');
  for (let i = 0; i < 2000; i++) { const v = r.int(3, 6); if (v < 3 || v > 6 || !Number.isInteger(v)) { fail('RNG.int utanför intervall: ' + v); break; } const f = r.next(); if (f < 0 || f >= 1) { fail('RNG.next utanför [0,1)'); break; } }
  const seen = new Set(); for (let i = 0; i < 500; i++) seen.add(r.int(3, 6)); if (seen.size !== 4 || !seen.has(3) || !seen.has(6)) fail('RNG.int når inte båda ändarna');
  const arr = [1, 2, 3, 4, 5]; if (r.shuffle(arr) !== arr || arr.slice().sort().join() !== '1,2,3,4,5') fail('RNG.shuffle');
  const w = { a: 0, b: 0 }; for (let i = 0; i < 4000; i++) w[r.weighted(['a', 'b'], x => (x === 'a' ? 1 : 3))]++; if (w.b < w.a * 2) fail('RNG.weighted skev');
  if (RNG(7).fork('x').next() !== RNG(7).fork('x').next() || RNG(7).fork('x').next() === RNG(7).fork('y').next()) fail('RNG.fork');
  if (typeof RNG.hash('abc') !== 'number' || RNG.hash('abc') !== RNG.hash('abc')) fail('RNG.hash');
  if (typeof RNG.randomSeed() !== 'number') fail('RNG.randomSeed');
}

const GAME_WEAPONS = [null, 'shotgun', 'rifle', 'smg', 'dbshotgun', 'crossbow', 'flaregun', 'sniper', 'axe', 'flamer', 'launcher', 'nailgun', 'staff', 'bow', 'knives', 'hammer', 'musket',
  'harpoon', 'boomerang', 'prism', 'sawlauncher', 'windgun', 'spear', 'sporelauncher', 'mirrorshield', 'whip'];
const weaponOpts = [undefined, 'g', 'r', 'm', 'd', 'b', 's', 'p', 'å', 'ä', 'ö', 'flamer', 'é', 'ü', 'ñ', 'bow', 'ô', 'û', 'ï', 'musket', 'À', 'Á', 'Â', 'prism', 'Į', 'į', 'Ĳ', 'spear',
  'Ŕ', 'ŕ', 'Ŗ', 'whip'];
const BIOME_IDS = Gen.BIOMES.map(b => b.id);
if (BIOME_IDS.join() !== 'dungeon,caves,graveyard,forest,courtyard,swamp,frost,volcano,tomb,crystal,sunken,clock,sky,fungus,mirror') fail('Gen.BIOMES ' + BIOME_IDS.join());
const OUTDOOR = { dungeon: false, caves: false, graveyard: true, forest: true, courtyard: true, swamp: true, frost: true, volcano: true, tomb: true, crystal: false, sunken: true, clock: false, sky: true,
  fungus: false, mirror: false };
const AMB = { dungeon: [0.12, 0.22], caves: [0.12, 0.17], graveyard: [0.24, 0.32], forest: [0.24, 0.32], courtyard: [0.24, 0.32], swamp: [0.2, 0.3], frost: [0.2, 0.26], volcano: [0.19, 0.25],
  tomb: [0.22, 0.28], crystal: [0.1, 0.14], sunken: [0.18, 0.24], clock: [0.16, 0.22], sky: [0.26, 0.32], fungus: [0.13, 0.18], mirror: [0.2, 0.26] };
const SKY_MIN = { graveyard: 0.75, forest: 0.85, courtyard: 0.25, swamp: 0.85, frost: 0.2, volcano: 0.2, tomb: 0.2, sunken: 0.2, sky: 1 }; // andel himmel bland gångbara rutor
const DUNGEONLIKE = ['dungeon', 'frost', 'volcano', 'tomb', 'sunken', 'clock', 'sky', 'mirror']; // fängelsehålans bygge (salar + korridorer)
for (const a of ['lava', 'nest', 'frozen', 'flooded', 'smithy', 'trap', 'gas', 'fortune', 'prison', 'challenge', 'offering', 'levervault', 'lockedvault', 'hut', 'sunkenshrine', 'bog',
  'throne', 'frozenlake', 'barracks', 'crystalhall', 'alchemy', 'chapel2', 'forge', 'lavalake', 'ashfield', 'magmachamber', 'camp',
  'burialchamber', 'pillarhall', 'treasury', 'sandtunnel', 'sandcourt', 'geode', 'prismhall', 'shardfield', 'cistern', 'drownedhall', 'wreckhall', 'coralgrotto', 'plaza',
  'gearworks', 'pendulumhall', 'workshop', 'cloudisle', 'harpynest', 'stormspire', 'cloudcourt', 'sporegrotto', 'giantcaps', 'myceliumden', 'mirrorhall', 'ballroom', 'gallery'])
  if (!Gen.ARCHES.includes(a)) fail('Gen.ARCHES saknar ' + a);
if (Gen.WEAPONS['å'] !== 'axe' || Gen.WEAPONS['ä'] !== 'flamer' || Gen.WEAPONS['ö'] !== 'launcher' || Gen.WEAPONS.g !== 'shotgun') fail('Gen.WEAPONS ' + JSON.stringify(Gen.WEAPONS));
if (Gen.WEAPONS['é'] !== 'nailgun' || Gen.WEAPONS['ü'] !== 'staff' || Gen.WEAPONS['ñ'] !== 'bow') fail('Gen.WEAPONS (version 6) ' + JSON.stringify(Gen.WEAPONS));
if (!Gen.GUARDIANS.frost || Gen.GUARDIANS.frost.wall !== '¦' || Gen.GUARDIANS.frost.floor !== 'floor_boss_frost' || Gen.GUARDIANS.frost.light !== 'c') fail('Gen.GUARDIANS.frost');
const FL = Gen.GUARDIANS.flame;
if (!FL || FL.wall !== '¤' || FL.floor !== 'floor_boss_volcano' || !'fc'.includes(FL.light) || [...FL.decor].some(c => !'ui'.includes(c))) fail('Gen.GUARDIANS.flame');
if (!Gen.ARENAS.includes('frost') || !Gen.ARENAS.includes('volcano') || !Gen.ARENAS.includes('tomb')) fail('Gen.ARENAS saknar frost/volcano/tomb');
if (typeof Gen.secret !== 'function') fail('Gen.secret saknas');
if (typeof Gen.maze !== 'function') fail('Gen.maze saknas');
if (Gen.WEAPONS['ô'] !== 'knives' || Gen.WEAPONS['û'] !== 'hammer' || Gen.WEAPONS['ï'] !== 'musket') fail('Gen.WEAPONS (version 7) ' + JSON.stringify(Gen.WEAPONS));
const PH = Gen.GUARDIANS.pharaoh;
if (!PH || PH.wall !== 'Ù' || PH.floor !== 'floor_boss_pharaoh' || PH.light !== 'c' || !PH.decor.includes('u') || !PH.decor.includes('²')) fail('Gen.GUARDIANS.pharaoh');
{ const t = Gen.BIOMES.find(b => b.id === 'tomb'); if (!t || t.name !== 'GRAVKAMMAREN' || !t.outdoor) fail('Gen.BIOMES: tomb'); }
// version 8: vapen, väktare, arenor och biomer
if (Gen.WEAPONS['À'] !== 'harpoon' || Gen.WEAPONS['Á'] !== 'boomerang' || Gen.WEAPONS['Â'] !== 'prism') fail('Gen.WEAPONS (version 8) ' + JSON.stringify(Gen.WEAPONS));
{
  const cq = Gen.GUARDIANS.crystalqueen, lv = Gen.GUARDIANS.leviathan;
  if (!cq || cq.wall !== 'Ĉ' || cq.floor !== 'floor_boss_crystalqueen' || !'cfĘ'.includes(cq.light)) fail('Gen.GUARDIANS.crystalqueen');
  if (!lv || lv.wall !== 'Ď' || lv.floor !== 'floor_boss_leviathan' || !'cfĘ'.includes(lv.light)) fail('Gen.GUARDIANS.leviathan');
  if (!Gen.ARENAS.includes('crystal') || !Gen.ARENAS.includes('sunken')) fail('Gen.ARENAS saknar crystal/sunken');
  const c = Gen.BIOMES.find(b => b.id === 'crystal'), s = Gen.BIOMES.find(b => b.id === 'sunken'), t = Gen.BIOMES.find(b => b.id === 'tomb');
  if (!c || c.name !== 'KRISTALLGROTTORNA' || c.outdoor || c.weight !== t.weight || c.depth.join() !== '1,5') fail('Gen.BIOMES: crystal');
  if (!s || s.name !== 'DEN SJUNKNA STADEN' || !s.outdoor || s.weight !== t.weight || s.depth.join() !== '1,5') fail('Gen.BIOMES: sunken');
}
// version 9: vapen, väktare, arenor och biomer
if (Gen.WEAPONS['Į'] !== 'sawlauncher' || Gen.WEAPONS['į'] !== 'windgun' || Gen.WEAPONS['Ĳ'] !== 'spear') fail('Gen.WEAPONS (version 9) ' + JSON.stringify(Gen.WEAPONS));
{
  const cm = Gen.GUARDIANS.clockmaker, tb = Gen.GUARDIANS.thunderbird;
  if (!cm || cm.wall !== 'Ļ' || cm.floor !== 'floor_boss_clockmaker' || !'cf'.includes(cm.light)) fail('Gen.GUARDIANS.clockmaker');
  if (!tb || tb.wall !== 'ľ' || tb.floor !== 'floor_boss_thunderbird' || !'cf'.includes(tb.light)) fail('Gen.GUARDIANS.thunderbird');
  if (!Gen.ARENAS.includes('clock') || !Gen.ARENAS.includes('sky')) fail('Gen.ARENAS saknar clock/sky');
  const c = Gen.BIOMES.find(b => b.id === 'clock'), s = Gen.BIOMES.find(b => b.id === 'sky'), t = Gen.BIOMES.find(b => b.id === 'tomb');
  if (!c || c.name !== 'KLOCKTORNET' || c.outdoor || c.weight !== t.weight || c.depth.join() !== '1,5') fail('Gen.BIOMES: clock');
  if (!s || s.name !== 'MOLNBORGEN' || !s.outdoor || s.weight !== t.weight || s.depth.join() !== '1,5') fail('Gen.BIOMES: sky');
}
// version 11: vapen, väktare, arenor och biomer
if (Gen.WEAPONS['Ŕ'] !== 'sporelauncher' || Gen.WEAPONS['ŕ'] !== 'mirrorshield' || Gen.WEAPONS['Ŗ'] !== 'whip') fail('Gen.WEAPONS (version 11) ' + JSON.stringify(Gen.WEAPONS));
{
  const mm = Gen.GUARDIANS.mycelmother, mk = Gen.GUARDIANS.mirrorking;
  if (!mm || mm.wall !== 'ş' || mm.floor !== 'floor_boss_mycelmother' || mm.light !== 'Ŧ') fail('Gen.GUARDIANS.mycelmother');
  if (!mk || mk.wall !== 'Ţ' || mk.floor !== 'floor_boss_mirrorking' || !'cf'.includes(mk.light)) fail('Gen.GUARDIANS.mirrorking');
  if (!Gen.ARENAS.includes('fungus') || !Gen.ARENAS.includes('mirror')) fail('Gen.ARENAS saknar fungus/mirror');
  const f = Gen.BIOMES.find(b => b.id === 'fungus'), m = Gen.BIOMES.find(b => b.id === 'mirror'), c = Gen.BIOMES.find(b => b.id === 'clock');
  if (!f || f.name !== 'SVAMPRIKET' || f.outdoor || f.weight !== c.weight || f.depth.join() !== '1,5') fail('Gen.BIOMES: fungus');
  if (!m || m.name !== 'SPEGELPALATSET' || m.outdoor || m.weight !== c.weight || m.depth.join() !== '1,5') fail('Gen.BIOMES: mirror');
}
const stats = { retries0: Gen.floor.stats.retries };
const B = {}; // statistik per biom
const samples = {};

// gemensamma kontroller för alla biomer (räkningar som för fängelsehålan)
function checkLevel(lv, seed, depth, opts, biome) {
  const tag = `[${biome} seed=${seed} d=${depth} ${JSON.stringify(opts)}]`;
  for (const e of Gen.validate(lv)) fail(tag + ' ' + e);
  if (lv.biome !== biome) fail(tag + ' biome ' + lv.biome);
  const m = lv.map, H = m.length, W = m[0].length;
  const lim = 30 + (depth - 1) * 3 + 2;
  if (W < 30 + (depth - 1) * 3 || W > Math.min(44, lim) || H < 30 + (depth - 1) * 3 || H > Math.min(44, lim)) fail(tag + ` kartstorlek ${W}x${H}`);
  const types = {}; for (const r of lv.rooms) types[r.type] = (types[r.type] || 0) + 1;
  if (types.start !== 1 || types.exit !== 1 || !(types.treasure >= 1)) fail(tag + ' rumstyper ' + JSON.stringify(types));
  if ((types.shop || 0) !== (opts.shop ? 1 : 0)) fail(tag + ' shop-rum ' + (types.shop || 0));
  if ((types.elite || 0) < 1 || (types.elite || 0) > Math.max(1, Math.floor(depth / 2))) fail(tag + ' elitrum ' + (types.elite || 0));
  if (types.guardian !== 1) fail(tag + ' vaktarsalar ' + types.guardian);
  if (count(m, 'E') !== (types.elite || 0)) fail(tag + ' antal E=' + count(m, 'E') + ' elitrum=' + types.elite);
  if (count(m, 'M') !== (opts.shop ? 1 : 0)) fail(tag + ' antal M ' + count(m, 'M'));
  if (count(m, 'C') < 1) fail(tag + ' kortkista saknas');
  if (types.secret) { if (count(m, '*') + count(m, '{') !== 1) fail(tag + ' hemlig/sprucken vägg ' + count(m, '*') + '/' + count(m, '{')); } else if (count(m, '*') + count(m, '{') !== 0) fail(tag + ' * eller { utan hemligt rum');
  for (const w of WCH) if (count(m, w) !== (wchOf(opts.weapon) === w ? 1 : 0)) fail(tag + ` vapen ${w}: ${count(m, w)}`);
  const en = [...OLD_EN + NEW_EN].reduce((n, c) => n + count(m, c), 0), want = 6 + 3 * depth;
  if (en < want - 6 || en > Math.round(want * 1.3) + 2) fail(tag + ` fiender ${en} (väntat ca ${want})`);
  const st0 = B[biome] = B[biome] || { n: 0, ms: [], cells: 0, open: 0, px: 0, pxMin: 99, props: 0, secret: 0, areas: 0, sky: 0 };
  st0.enRel = (st0.enRel || 0) + (en + count(m, 'E') + count(m, 'Q')) / want;
  if (depth === 1 && [...'VIONRW'].some(c => count(m, c) > 0)) fail(tag + ' för svår fiende på djup 1');
  if (depth === 2 && [...'NRW'].some(c => count(m, c) > 0)) fail(tag + ' för svår fiende på djup 2');
  for (const c of NEW_EN) if (count(m, c) && (depth < NEW_DEPTH[c] || !NEW_BIOME[biome].includes(c))) fail(tag + ` ny fiende ${c} får inte finnas här (${count(m, c)})`);
  // elitfiender och vanliga fiender minst 7 rutor från P
  let px = 0, py = 0; m.forEach((r, y) => { const x = r.indexOf('P'); if (x >= 0) { px = x; py = y; } });
  m.forEach((r, y) => [...r].forEach((c, x) => { if ((ENEMIES + 'Z').includes(c) && Math.hypot(x - px, y - py) < 7) fail(tag + ` fiende ${c} ${Math.hypot(x - px, y - py).toFixed(1)} från P`); }));
  const gold = count(m, '$'), pots = count(m, 'o'), nf = count(m, 'f');
  if (gold < 3 || gold > (biome === 'tomb' ? 16 : biome === 'sunken' ? 9 : 8)) fail(tag + ' guld ' + gold); // gravkammarens gravkamrar och skattkammare har egna guldhögar, sjunkna stadens vattenskatt
  if (pots < 1 || pots > 8) fail(tag + ' krukor ' + pots);
  if (nf + count(m, 'Ę') + count(m, 'Ņ') + count(m, 'Ŧ') < 1) fail(tag + ' inga eldfat/glödkristaller/urverk/glödsvampar');
  const ne = count(m, 'e'), nz = count(m, 'z');
  if (ne < 1 || ne > 4) fail(tag + ' explosiva tunnor ' + ne);
  if (nz > 6) fail(tag + ' spikfällor ' + nz);
  if (count(m, 'w') > 1 || count(m, 'y') > 1) fail(tag + ` brunnar ${count(m, 'w')} altare ${count(m, 'y')}`);
  if (count(m, 'w') !== (types.shrine || 0)) fail(tag + ` brunnar ${count(m, 'w')} men helgedomar ${types.shrine || 0}`);
  const amb = AMB[biome];
  if (!(lv.ambient >= amb[0] && lv.ambient <= amb[1])) fail(tag + ' ambient ' + lv.ambient);
  if (!Array.isArray(lv.floors) || lv.floors[0] !== lv.floor || !Array.isArray(lv.floorMask)) fail(tag + ' floors/floorMask');
  // himmel: inomhus null, utomhus mestadels öppen
  let walk = 0, open = 0, skyN = 0, props = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const c = m[y][x];
    if (c === 't' || c === 'n') props++;
    if (isWall(c)) continue;
    walk++; if (!isBlock(c)) open++;
    if (lv.sky && lv.sky[y][x] === '1') skyN++;
  }
  if (OUTDOOR[biome]) { if (!lv.sky) fail(tag + ' sky saknas utomhus'); else if (skyN / walk < SKY_MIN[biome]) fail(tag + ` för lite himmel ${(skyN / walk).toFixed(2)}`); }
  else if (lv.sky !== null) fail(tag + ' sky ska vara null inomhus');
  // utgången långt bort: väglängd P->x i förhållande till kartans storlek
  const dPX = pathPX(m), rel = dPX / Math.max(W, H);
  if (dPX < 0) fail(tag + ' ingen väg P->x');
  else if (rel < (DUNGEONLIKE.includes(biome) ? 0.5 : 0.8)) fail(tag + ` utgången för nära: ${dPX} steg (${rel.toFixed(2)} av kartbredden)`);
  // träd och gravstenar får aldrig stänga av något: ta bort dem och jämför nåbar yta (validate har redan kollat nåbarheten med dem)
  const s = B[biome];
  s.n++; s.cells += W * H; s.open += open / (W * H); s.px += rel; s.pxMin = Math.min(s.pxMin, rel); s.props += props; s.areas += lv.rooms.length;
  if (types.secret) s.secret++;
  if (lv.sky) s.sky += skyN / walk;
  for (const c of OLD_EN + NEW_EN) s['typ' + c] = (s['typ' + c] || 0) + count(m, c);
  checkRooms(lv, tag, s, px, py);
  checkNew(lv, tag, s, biome, px, py);
  checkV6(lv, tag, s, biome, px, py, depth);
  checkV7(lv, tag, s, biome, px, py, depth);
  checkV8(lv, tag, s, biome, px, py, depth);
  checkV9(lv, tag, s, biome, px, py, depth);
  checkV10(lv, tag, s, biome, px, py, depth);
  checkV11(lv, tag, s, biome, px, py, depth);
  return { tag, types };
}

// rum (via roomMask), vaktarens sal, fiendegrupper, rekvisita och fällor
function checkRooms(lv, tag, s, px, py) {
  const m = lv.map, H = m.length, W = m[0].length, rm = lv.roomMask;
  if (!Array.isArray(rm) || rm.length !== H) { fail(tag + ' roomMask saknas'); return; }
  const R = lv.rooms.map(() => ({ en: 0, props: 0, loot: '', cells: 0, chars: '' }));
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const k = rm[y].charCodeAt(x) - 48, c = m[y][x];
    if (rm[y][x] === '-') { if (ENEMIES.includes(c) || c === 'Z') fail(tag + ` fiende ${c} utanför alla rum vid ${x},${y}`); continue; }
    const r = R[k]; if (!r) { fail(tag + ' roomMask pekar på okänt rum ' + k); return; }
    r.cells++;
    if (ENEMIES.includes(c)) r.en++;
    if (PROPS.includes(c)) r.props++;
    if (('ZMwyChaA$¥' + WCH).includes(c)) r.loot += c;
    if (c !== '.' && !isWall(c)) r.chars += c;
  }
  // vaktaren: exakt ett Z, i salen av typen guardian, väggar i vaktarens tecken, golv i vaktarens textur, fri 5x5
  const gi = lv.rooms.findIndex(r => r.type === 'guardian'), gd = GUARD[lv.guardian];
  if (!gd) fail(tag + ' okänd vaktare ' + lv.guardian);
  if (count(m, 'Z') !== 1) fail(tag + ' antal Z ' + count(m, 'Z'));
  let zx = -1, zy = -1; m.forEach((r, y) => { const x = r.indexOf('Z'); if (x >= 0) { zx = x; zy = y; } });
  if (gi < 0 || !gd) return;
  const G = lv.rooms[gi];
  if (G.guardian !== lv.guardian) fail(tag + ' vaktarsalen saknar guardian-id');
  if (zx >= 0) {
    if (rm[zy].charCodeAt(zx) - 48 !== gi) fail(tag + ' Z ligger inte i vaktarens sal');
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (isBlock(m[zy + dy][zx + dx])) fail(tag + ` hinder ${m[zy + dy][zx + dx]} vid Z (${zx + dx},${zy + dy})`);
    const bf = lv.floors.indexOf(gd.floor);
    if (bf < 0 || +lv.floorMask[zy][zx] !== bf) fail(tag + ' vaktarens golv saknas vid Z');
    // salens golv: nästan allt i vaktarens textur
    let gf = 0, gn = 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (rm[y].charCodeAt(x) - 48 === gi && m[y][x] !== 'Ń') { gn++; if (+lv.floorMask[y][x] === bf) gf++; } // (molnborgen: tomrum längs kanterna)
    if (gf < gn * (lv.guardian === 'leviathan' ? 0.7 : 0.9)) fail(tag + ` vaktarens golv bara på ${gf}/${gn} rutor`); // leviatans sal har en bassäng
    // väggarna runt salen
    let wn = 0;
    for (let y = G.y - 1; y <= G.y + G.h; y++) for (let x = G.x - 1; x <= G.x + G.w; x++) if (m[y] && m[y][x] === gd.wall) wn++;
    if (wn < (lv.biome === 'sky' ? 4 : 2 * (G.w + G.h))) fail(tag + ` vaktarsalen har bara ${wn} väggar ${gd.wall}`); // molnborgen: tomrum runt salen, glesa murar
    if (G.w < 7 || G.h < 7 || G.w > 13 || G.h > 13) fail(tag + ` vaktarsalen ${G.w}x${G.h}`);
    const lights = [...R[gi].chars].filter(c => c === 'c' || c === 'f' || c === 'Ę' || c === 'Ŧ').length;
    if (lights < 2 || lights > 4) fail(tag + ' ljuskällor i vaktarsalen ' + lights);
    // vaktaren ligger långt från start: gångavstånd P->Z jämfört med längsta gångavståndet från P
    const d = new Int32Array(W * H).fill(-1), q = [py * W + px]; d[q[0]] = 0; let mx = 0;
    for (let qh = 0; qh < q.length; qh++) { const c = q[qh], x = c % W, y = (c / W) | 0; mx = Math.max(mx, d[c]); for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) { const ni = ny * W + nx; if (d[ni] < 0 && !isBlock(m[ny][nx])) { d[ni] = d[c] + 1; q.push(ni); } } }
    const rel = d[zy * W + zx] / mx;
    if (!(rel >= 0.3)) fail(tag + ` vaktaren för nära start (${rel.toFixed(2)})`);
    s.gdist = (s.gdist || 0) + rel; s.gmin = Math.min(s.gmin === undefined ? 9 : s.gmin, rel);
  }
  // varje rum: aldrig exakt en fiende; stridsrum har en grupp (>= 2), specialrum har sitt innehåll, alla utom start har rekvisita
  s.hist = s.hist || {}; s.arch = s.arch || {}; s.propN = s.propN || {};
  lv.rooms.forEach((r, i) => {
    const q = R[i];
    if (!r.arch) fail(tag + ` rum ${i} (${r.type}) saknar arch`);
    s.arch[r.arch] = (s.arch[r.arch] || 0) + 1;
    if (q.en === 1) fail(tag + ` rum ${i} (${r.type}/${r.arch}) har exakt en fiende`);
    if (r.type === 'start') { if (q.en) fail(tag + ' fiender i startområdet'); return; }
    s.hist[q.en] = (s.hist[q.en] || 0) + 1;
    if (SPECIAL.includes(r.type)) {
      if (q.en) fail(tag + ` specialrum ${i} (${r.type}) har ${q.en} fiender`);
      const need = r.type === 'special' ? SP_CH[r.arch] : r.type === 'vault' ? LOOT : { shop: 'M', shrine: 'w', treasure: 'C', secret: 'CA', guardian: 'Z' }[r.type];
      if (!need || ![...need].some(c => q.chars.includes(c))) fail(tag + ` specialrum ${i} (${r.type}/${r.arch}) saknar ${need}`);
    } else if (q.en < 2) fail(tag + ` rum ${i} (${r.type}/${r.arch}) har ${q.en} fiender`);
    if (r.type !== 'guardian' && !q.props) fail(tag + ` rum ${i} (${r.type}/${r.arch}) saknar rekvisita`);
  });
  // spikfällor: aldrig på/intill P, x eller dörrar (även grindar, låsta dörrar och spruckna väggar)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const c = m[y][x];
    if (PROPS.includes(c)) s.propN[c] = (s.propN[c] || 0) + 1;
    if (c !== 'z') continue;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if ('Px'.includes(m[y + dy][x + dx])) fail(tag + ` spikfälla intill ${m[y + dy][x + dx]} vid ${x},${y}`);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (DOORS.includes(m[y + dy][x + dx])) fail(tag + ` spikfälla i dörröppning vid ${x},${y}`);
  }
  // äkta kista finns alltid, mimics bara i rum med andra fiender
  if (count(m, 'C') < 1) fail(tag + ' ingen äkta kista');
  s.mimic = (s.mimic || 0) + count(m, 'Q');
  // rekvisitan stänger inte av något: med grindar/låsta dörrar/spruckna väggar stängda och utan att gå på lava eller spikar
  // nås alla gångbara rutor utom valven och hemliga rum; med allt öppet nås allt. Ingen blockerande sak står i en dörröppning.
  const closed = floodD(m, px, py, c => !isBlock(c) && !SINK.includes(c)), opened = floodD(m, px, py, c => (!isBlock(c) || GATES.includes(c)) && !SINK.includes(c));
  const anyway = floodD(m, px, py, c => !isBlock(c) || GATES.includes(c)), swim = floodD(m, px, py, swimPass);
  const roomOf = (x, y) => lv.rooms[rm[y].charCodeAt(x) - 48];
  let bad = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const c = m[y][x], i = y * W + x;
    if (isBlock(c)) continue;
    const r = roomOf(x, y), opt = r && (r.type === 'vault' || r.type === 'secret');
    const hz = SINK.includes(c), wetOK = WATER_LOOT.includes(c) && swim[i] >= 0; // vattenskatten nås simmande
    if (anyway[i] < 0 || (!hz && opened[i] < 0 && !wetOK) || (!hz && closed[i] < 0 && !opt && !wetOK)) bad++;
    if (closed[i] >= 0 && r && r.type === 'vault') fail(tag + ` valvet nås utan att öppna grinden/låset vid ${x},${y}`);
  }
  if (bad) fail(tag + ` ${bad} rutor nås inte (rekvisita, lava, spikar eller grindar stänger av)`);
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) if (('kquvwyeHJT' + INTERACT + NPCS + V6BLOCK + V7BLOCK + V8BLOCK + V9BLOCK + V10BLOCK + V11BLOCK).includes(m[y][x]))
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (DOORS.includes(m[y + dy][x + dx])) fail(tag + ` ${m[y][x]} i dörröppning vid ${x},${y}`);
  // säker väg (utan lava och spikar) P->x och P->Z
  const X = findCh(m, 'x'), Zc = findCh(m, 'Z');
  if (!X || closed[X[1] * W + X[0]] < 0) fail(tag + ' ingen väg P->x utan lava/spikar');
  if (!Zc || ![[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => closed[(Zc[1] + dy) * W + Zc[0] + dx] >= 0)) fail(tag + ' ingen väg P->Z utan lava/spikar');
}

// nya saker (version 4): antal, tak, placering, valv med grindar och lås, farliga golv, specialrum
function checkNew(lv, tag, s, biome, px, py) {
  const m = lv.map, H = m.length, W = m[0].length, rm = lv.roomMask;
  const roomOf = (x, y) => lv.rooms[rm[y].charCodeAt(x) - 48];
  const n = {}; for (const r of m) for (const c of r) n[c] = (n[c] || 0) + 1;
  const N = c => n[c] || 0;
  // level.features stämmer med kartan
  if (!lv.features) fail(tag + ' level.features saknas');
  else for (const k in FEAT) if (lv.features[k] !== N(FEAT[k])) fail(tag + ` features.${k} = ${lv.features[k]}, kartan har ${N(FEAT[k])}`);
  // tak
  for (const c of INTERACT + "}'") if (N(c) > 1) fail(tag + ` ${N(c)} st ${c}`);
  if (N('<') > 4) fail(tag + ' pilplattor ' + N('<'));
  if (N('>') > 3) fail(tag + ' gasventiler ' + N('>'));
  if (N(',') < 1 || N(',') > 5) fail(tag + ' granatknippen ' + N(','));
  if (N('£') > 1 || N('€') > 1 || N('©') > 1 || N('¥') > 2 || N('Ç') > 8) fail(tag + ` tak: £${N('£')} €${N('€')} ©${N('©')} ¥${N('¥')} Ç${N('Ç')}`);
  if (!!N('|') !== !!N('/')) fail(tag + ` grindar ${N('|')} men spakar ${N('/')}`);
  if (!!N(']') !== !!N('}')) fail(tag + ` låsta dörrar ${N(']')} men nycklar ${N('}')}`);
  // valv: type vault med lock, ingångar bara | (spak) eller en ] (nyckel), inga fiender, något att hämta
  const vaults = lv.rooms.map((r, i) => [r, i]).filter(([r]) => r.type === 'vault');
  const vl = vaults.filter(([r]) => r.lock === 'lever').length, vk = vaults.filter(([r]) => r.lock === 'key').length;
  if (vl > 1 || vk > 1 || vl !== (N('/') ? 1 : 0) || vk !== (N('}') ? 1 : 0)) fail(tag + ` valv: spak ${vl}, lås ${vk}`);
  if (N(']') > 1) fail(tag + ' flera låsta dörrar');
  for (const [r, i] of vaults) {
    if (r.arch !== (r.lock === 'lever' ? 'levervault' : 'lockedvault')) fail(tag + ` valv ${i} har arch ${r.arch}`);
    let loot = 0, gates = 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (rm[y].charCodeAt(x) - 48 !== i) continue;
      if (LOOT.includes(m[y][x])) loot++;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const xx = x + dx, yy = y + dy, c = m[yy][xx];
        if (rm[yy].charCodeAt(xx) - 48 === i || isWall(c)) continue;
        if (c !== (r.lock === 'lever' ? '|' : ']')) fail(tag + ` valv ${i} har ingången "${c}" vid ${xx},${yy}`); else gates++;
      }
    }
    if (!loot) fail(tag + ` valv ${i} är tomt`);
    if (!gates || (r.lock === 'key' && gates !== 1)) fail(tag + ` valv ${i} har ${gates} ingångar`);
  }
  s.feat = s.feat || {}; s.featN = s.featN || {}; s.vault = s.vault || { lever: 0, key: 0, pocket: 0 };
  for (const [r] of vaults) { s.vault[r.lock]++; if (r.w === 3 && r.h === 3 && r.tag === 'vault') s.vault.pocket++; }
  // placering
  const near = (x, y, ch, d) => { for (let yy = y - d; yy <= y + d; yy++) for (let xx = x - d; xx <= x + d; xx++) if (m[yy] && m[yy][xx] === ch) return true; return false; };
  const closed = floodD(m, px, py, c => !isBlock(c) && !SINK.includes(c)), swim = floodD(m, px, py, swimPass);
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const c = m[y][x], r = roomOf(x, y);
    if (HAZ.includes(c) && (near(x, y, 'P', 1) || near(x, y, 'x', 1))) fail(tag + ` ${c} intill P/x vid ${x},${y}`);
    if ('ĚĞĠ'.includes(c) && ![[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => closed[(y + dy) * W + x + dx] >= 0 || (c === 'Ě' && swim[(y + dy) * W + x + dx] >= 0))) fail(tag + ` ${c} nås inte vid ${x},${y}`);
    if (c === '<') {
      let ok = false;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) for (let k = 1; k <= 6; k++) { const a = m[y + dy * k] && m[y + dy * k][x + dx * k]; if (a === undefined) break; if (isWall(a)) { ok = true; break; } if (isBlock(a)) break; }
      if (!ok) fail(tag + ` pilplatta utan vägg inom 6 vid ${x},${y}`);
      if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => DOORS.includes(m[y + dy][x + dx]))) fail(tag + ` pilplatta i dörröppning vid ${x},${y}`);
    }
    if ((INTERACT + NPCS + V7BLOCK + 'Ňň').includes(c) && ![[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => closed[(y + dy) * W + x + dx] >= 0)) fail(tag + ` ${c} nås inte vid ${x},${y}`);
    if ('/}'.includes(c) && (!r || r.type === 'vault' || r.type === 'secret' || r.type === 'guardian')) fail(tag + ` ${c} ligger i ${r ? r.type : 'korridor'} vid ${x},${y}`);
    if (c === '}' && closed[y * W + x] < 0) fail(tag + ` nyckeln nås inte utan att öppna något vid ${x},${y}`);
    // nya tecken bara där de hör hemma
    const arch = r ? r.arch : '';
    if (c === '_' && !(biome === 'caves' && arch === 'lava') && !(biome === 'volcano' && r)) fail(tag + ` lava utanför lavarum (${arch}) vid ${x},${y}`);
    if (c === ':' && arch !== 'frozen' && !(biome === 'frost' && r)) fail(tag + ` is utanför frusna rum (${arch}) vid ${x},${y}`);
    // version 5: istappar bara i frostfästets rum (eller frusna rum), aldrig vid dörrar; NPC:er i sina rum, butiken eller specialrum;
    // husdjursburen i ett stridsrum; drycker i rum
    if (c === 'Ç') {
      if (!r || (biome !== 'frost' && arch !== 'frozen')) fail(tag + ` istapp i ${biome}/${arch} vid ${x},${y}`);
      if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => DOORS.includes(m[y + dy][x + dx]))) fail(tag + ` istapp i dörröppning vid ${x},${y}`);
      if (![[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => isWall(m[y + dy][x + dx]))) fail(tag + ` istapp inte vid en vägg ${x},${y}`);
    }
    if ((c === '£' || c === '€') && (!r || !(r.type === 'shop' || (r.type === 'special' && r.arch !== 'challenge')))) fail(tag + ` NPC ${c} i ${r ? r.type + '/' + arch : 'korridor'} vid ${x},${y}`);
    if (c === '£' && r && r.type === 'special' && !['alchemy', 'fortune', 'offering', 'smithy', 'chapel2'].includes(arch)) fail(tag + ` alkemist i ${arch}`);
    if (c === '©' && (!r || !['normal', 'elite', 'exit'].includes(r.type))) fail(tag + ` husdjursbur i ${r && r.type}`);
    if (c === '¥' && !r) fail(tag + ` dryck utanför rum vid ${x},${y}`);
    if (NPCS.includes(c) && [[1, 0], [-1, 0], [0, 1], [0, -1]].every(([dx, dy]) => isBlock(m[y + dy][x + dx]))) fail(tag + ` ${c} har ingen fri sida vid ${x},${y}`);
    if (c === '-' && biome !== 'swamp' && !['flooded', 'mudflat'].includes(arch)) fail(tag + ` vatten i ${biome}/${arch} vid ${x},${y}`);
    if (c === '>' && arch !== 'gas' && biome !== 'caves' && biome !== 'swamp') fail(tag + ` gasventil i ${biome}/${arch} vid ${x},${y}`);
    if (c === '"' && !r) fail(tag + ` spindelväv utanför rum vid ${x},${y}`);
    if (c === '?' && (!r || r.arch !== 'challenge' || r.w < 7 || r.h < 7)) fail(tag + ` utmaningsaltare i ${arch} ${r && r.w}x${r && r.h}`);
    if (c === ')' && arch !== 'fortune') fail(tag + ` spåaltare i ${arch}`);
    if (c === ';' && arch !== 'offering') fail(tag + ` offerskål i ${arch}`);
    if (c === '(' && !['smithy', 'armory', 'camp', 'drill', 'storeroom', 'forge'].includes(arch)) fail(tag + ` städ i ${arch}`);
    if (c === '[' && (!r || !['normal', 'elite', 'exit'].includes(r.type))) fail(tag + ` fångbur i ${r && r.type}`);
    if (c === '+' && biome !== 'dungeon') fail(tag + ' levande rustning utanför fängelsehålan');
  }
  for (const k in FEAT) { s.feat[k] = (s.feat[k] || 0) + (N(FEAT[k]) ? 1 : 0); s.featN[k] = (s.featN[k] || 0) + N(FEAT[k]); }
  for (const c of ",'}") { s.feat[c] = (s.feat[c] || 0) + (N(c) ? 1 : 0); s.featN[c] = (s.featN[c] || 0) + N(c); }
  for (const c of WCH) s.wpn = (s.wpn || 0) + N(c);
  if (lv.rooms.some(r => r.type === 'secret')) s.secretN = (s.secretN || 0) + 1;
  // spindelbon har spindlar och väv, lavarum har lava, frusna rum is
  lv.rooms.forEach((r, i) => {
    let ch = '', free = 0;
    for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) if (rm[y] && rm[y].charCodeAt(x) - 48 === i) { ch += m[y][x]; if (m[y][x] === '.' && Math.abs(x - px) + Math.abs(y - py) > 3) free++; }
    if (free < 6) return; // rummet är fullt (rekvisita, dörrpassager)
    if (r.arch === 'nest' && !ch.includes('"')) fail(tag + ` spindelbo ${i} utan väv`);
    if (r.arch === 'nest' && ['normal', 'exit'].includes(r.type) && !ch.includes('U')) fail(tag + ` spindelbo ${i} utan spindlar`);
    if (r.arch === 'frozen' && !ch.includes(':')) fail(tag + ` fruset rum ${i} utan is`);
    if (r.arch === 'flooded' && !ch.includes('-')) fail(tag + ` översvämmat rum ${i} utan vatten`);
    if (r.arch === 'frozenlake' && !ch.includes(':')) fail(tag + ` frusen sjö ${i} utan is`);
    if (r.arch === 'alchemy' && !ch.includes('£')) fail(tag + ` alkemistens rum ${i} utan alkemist`);
    if (r.arch === 'chapel2' && !ch.includes('€')) fail(tag + ` prästens kapell ${i} utan präst`);
  });
}

// version 6: nya tecken bara där de får finnas, taken, och smulande golv som aldrig är enda vägen
const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
function checkV6(lv, tag, s, biome, px, py, depth) {
  const m = lv.map, H = m.length, W = m[0].length, rm = lv.roomMask;
  const ri = (x, y) => (rm[y][x] === '-' ? -1 : rm[y].charCodeAt(x) - 48), roomOf = (x, y) => lv.rooms[ri(x, y)];
  const n = {}; for (const r of m) for (const c of r) n[c] = (n[c] || 0) + 1;
  const N = c => n[c] || 0;
  for (const c in V6CAP) if (N(c) > V6CAP[c]) fail(tag + ` för många ${c}: ${N(c)}`);
  if (N('µ') + N('ß') > 3) fail(tag + ` gift-/frosttunnor ${N('µ')}+${N('ß')}`);
  // startrummet och rummen som gränsar till det (bara korridorer/dörrar emellan)
  const si = lv.rooms.findIndex(r => r.type === 'start'), adj = new Set([si]);
  {
    const seen = new Uint8Array(W * H), st = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (ri(x, y) === si) { seen[y * W + x] = 1; st.push(y * W + x); }
    while (st.length) {
      const c = st.pop(), x = c % W, y = (c / W) | 0;
      for (const [dx, dy] of N4) {
        const nx = x + dx, ny = y + dy, ni = ny * W + nx;
        if (seen[ni] || isWall(m[ny][nx])) continue;
        seen[ni] = 1;
        if (ri(nx, ny) < 0) st.push(ni); else adj.add(ri(nx, ny));
      }
    }
  }
  const nearDoor = (x, y) => N4.some(([dx, dy]) => DOORS.includes(m[y + dy][x + dx]));
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const c = m[y][x], r = ri(x, y) >= 0 ? roomOf(x, y) : null;
    if (!'¶®÷ðª°¬±¨ÞÑÆÐÝµß'.includes(c)) continue;
    if (c === '¶' && (!r || r.type !== 'special' || r.arch !== 'camp')) fail(tag + ` lägereld i ${r ? r.type + '/' + r.arch : 'korridor'} vid ${x},${y}`);
    if (c === '®' && (!r || !adj.has(ri(x, y)))) fail(tag + ` anslagstavla i ${r ? r.type : 'korridor'} som inte gränsar till start vid ${x},${y}`);
    if (c === '÷' && (!r || r.type !== 'secret')) fail(tag + ` hemlig trappa i ${r ? r.type : 'korridor'} vid ${x},${y}`);
    if (c === 'ð' && (!r || !['camp', 'barracks', 'forge'].includes(r.arch))) fail(tag + ` kött i ${r ? r.arch : 'korridor'} vid ${x},${y}`);
    if (c === 'ª' && !r) fail(tag + ` runsten utanför rum vid ${x},${y}`);
    if (c === '°') {
      if (biome !== 'dungeon' && biome !== 'volcano') fail(tag + ` eldstråle i ${biome}`);
      if (r && !N4.some(([dx, dy]) => isWall(m[y + dy][x + dx]))) fail(tag + ` eldstråle mitt i rummet vid ${x},${y}`);
    }
    if (c === '±' && (r || !((isWall(m[y - 1][x]) && isWall(m[y + 1][x])) || (isWall(m[y][x - 1]) && isWall(m[y][x + 1]))))) fail(tag + ` pendelblad utanför en smal korridor vid ${x},${y}`);
    if (c === '¨') {
      let ok = false;
      if (r) for (let yy = 1; yy < H - 1 && !ok; yy++) for (let xx = 1; xx < W - 1; xx++) if (ri(xx, yy) === ri(x, y) && N4.some(([dx, dy]) => '*{'.includes(m[yy + dy][xx + dx]))) { ok = true; break; }
      if (!ok) fail(tag + ` tryckplatta utan hemlig/sprucken vägg i rummet vid ${x},${y}`);
    }
    if ('°¬±¨'.includes(c) && nearDoor(x, y)) fail(tag + ` fälla ${c} i dörröppning vid ${x},${y}`);
    if (c === 'Þ' && (biome !== 'volcano' || !N4.some(([dx, dy]) => m[y + dy][x + dx] === '_'))) fail(tag + ` lavamask utan lava (${biome}) vid ${x},${y}`);
    if ('ÑÆÞÐÝ'.includes(c) && (!r || !['normal', 'elite', 'exit'].includes(r.type))) fail(tag + ` ny fiende ${c} i ${r ? r.type : 'korridor'}`);
  }
  // smulande golv: med ¬ som vägg (grindar stängda, ingen lava/spikar) nås x, vaktaren och varje ruta i alla rum utom valv och hemliga rum
  if (N('¬')) {
    const d = floodD(m, px, py, c => !isBlock(c) && !SINK.includes(c)), X = findCh(m, 'x'), Zc = findCh(m, 'Z');
    if (!X || d[X[1] * W + X[0]] < 0) fail(tag + ' smulande golv stänger av vägen P->x');
    if (Zc && !N4.some(([dx, dy]) => d[(Zc[1] + dy) * W + Zc[0] + dx] >= 0)) fail(tag + ' smulande golv stänger av vaktaren');
    const lost = new Set();
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const c = m[y][x], r = ri(x, y) >= 0 ? roomOf(x, y) : null;
      if (!r || r.type === 'vault' || r.type === 'secret' || isBlock(c) || SINK.includes(c)) continue;
      if (d[y * W + x] < 0) lost.add(ri(x, y));
    }
    if (lost.size) fail(tag + ` smulande golv stänger av rum ${[...lost].join(',')}`);
    s.crumbleOK = (s.crumbleOK || 0) + 1;
  }
}

// version 7: nya tecken bara där de får finnas, taken, kvicksand som aldrig är enda vägen, rullstenens korridor, ljusschakten
function checkV7(lv, tag, s, biome, px, py, depth) {
  const m = lv.map, H = m.length, W = m[0].length, rm = lv.roomMask;
  const ri = (x, y) => (rm[y][x] === '-' ? -1 : rm[y].charCodeAt(x) - 48), roomOf = (x, y) => lv.rooms[ri(x, y)];
  const n = {}; for (const r of m) for (const c of r) n[c] = (n[c] || 0) + 1;
  const N = c => n[c] || 0;
  for (const c in V7CAP) if (N(c) > V7CAP[c]) fail(tag + ` för många ${c}: ${N(c)}`);
  if (lv.features.beams !== (lv.beams || []).length) fail(tag + ' features.beams');
  const combat = r => r && ['normal', 'elite', 'exit'].includes(r.type);
  const quiet = r => r && (['shop', 'shrine', 'treasure'].includes(r.type) || (r.type === 'special' && r.arch !== 'challenge'));
  const closed = floodD(m, px, py, c => !isBlock(c) && !SINK.includes(c));
  const reach = (x, y) => N4.some(([dx, dy]) => closed[(y + dy) * W + x + dx] >= 0);
  const wallAdj = (x, y) => N4.some(([dx, dy]) => edgeC(m[y + dy][x + dx])); // (molnborgen: vid öns kant)
  const scar = {};
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const c = m[y][x];
    if (!'²³çÿýþ¼½¯¹ÃÕÊÎÔÈÌÙ'.includes(c)) continue;
    const r = ri(x, y) >= 0 ? roomOf(x, y) : null, arch = r ? r.arch : '';
    if (c === '²' && !(biome === 'tomb' ? r : r && (arch === 'crypt' && (biome === 'graveyard' || biome === 'dungeon') || (r.type === 'guardian' && lv.guardian === 'pharaoh'))))
      fail(tag + ` sarkofag i ${biome}/${r ? r.type + '/' + arch : 'korridor'} vid ${x},${y}`);
    if (c === '³' && (!combat(r) || depth < 2 || !wallAdj(x, y))) fail(tag + ` larmklocka i ${r ? r.type : 'korridor'} (djup ${depth}) vid ${x},${y}`);
    if (c === 'ç' && !quiet(r)) fail(tag + ` spelare i ${r ? r.type + '/' + arch : 'korridor'} vid ${x},${y}`);
    if (c === 'ÿ' && (depth < 2 || !(quiet(r) || (r && r.type === 'start')))) fail(tag + ` bankir i ${r ? r.type : 'korridor'} (djup ${depth}) vid ${x},${y}`);
    if (c === 'ý' && r && !(quiet(r) || r.type === 'start')) fail(tag + ` vandrare i ${r.type}/${arch} vid ${x},${y}`);
    if (c === 'ý' && !r && N4.filter(([dx, dy]) => edgeC(m[y + dy][x + dx])).length !== 3) fail(tag + ` vandrare i korridoren utanför en nisch vid ${x},${y}`);
    if ('²³çÿý'.includes(c) && !reach(x, y)) fail(tag + ` ${c} nås inte från någon sida vid ${x},${y}`);
    if ('þ¼½'.includes(c) && (!r || r.type === 'guardian' || r.type === 'shop')) fail(tag + ` föremål ${c} i ${r ? r.type : 'korridor'} vid ${x},${y}`);
    if (c === '¯' && (biome !== 'tomb' || (r && arch !== 'sandtunnel' && r.tag !== 'yard'))) fail(tag + ` kvicksand i ${biome}/${arch || 'korridor'} vid ${x},${y}`);
    if ((c === '¯' || c === '¹') && N4.some(([dx, dy]) => DOORS.includes(m[y + dy][x + dx]))) fail(tag + ` ${c} i dörröppning vid ${x},${y}`);
    if (c === '¹' && (biome !== 'tomb' && biome !== 'dungeon')) fail(tag + ` rullsten i ${biome}`);
    if ('ÃÕÊÎÔ'.includes(c) && !combat(r)) fail(tag + ` ny fiende ${c} i ${r ? r.type : 'korridor'}`);
    if (c === 'Õ') scar[ri(x, y)] = (scar[ri(x, y)] || 0) + 1;
    if ((c === 'È' || c === 'Ì') && biome !== 'tomb') fail(tag + ` sandstensvägg ${c} i ${biome}`);
    if (c === 'Ù' && lv.guardian !== 'pharaoh') fail(tag + ` faraonens vägg utan faraonen`);
  }
  for (const k in scar) if (scar[k] < 3 || scar[k] > 5) fail(tag + ` skarabéer i rum ${k}: ${scar[k]} (väntat en grupp om 3-5)`);
  // kvicksand: med ¯ (och lava, spikar, smulande golv) som vägg nås x, vaktaren och varje ruta i alla rum utom valv och hemliga rum;
  // varje fläck är 2-8 rutor
  if (N('¯')) {
    const X = findCh(m, 'x'), Zc = findCh(m, 'Z');
    if (!X || closed[X[1] * W + X[0]] < 0) fail(tag + ' kvicksand stänger av vägen P->x');
    if (Zc && !reach(Zc[0], Zc[1])) fail(tag + ' kvicksand stänger av vaktaren');
    const lost = new Set();
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const c = m[y][x], r = ri(x, y) >= 0 ? roomOf(x, y) : null;
      if (!r || r.type === 'vault' || r.type === 'secret' || isBlock(c) || SINK.includes(c)) continue;
      if (closed[y * W + x] < 0) lost.add(ri(x, y));
    }
    if (lost.size) fail(tag + ` kvicksand stänger av rum ${[...lost].join(',')}`);
    const seen = new Uint8Array(W * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (m[y][x] === '¯' && !seen[y * W + x]) {
      const st = [[x, y]]; seen[y * W + x] = 1; let k = 0;
      while (st.length) { const [cx, cy] = st.pop(); k++; for (const [dx, dy] of N4) { const nx = cx + dx, ny = cy + dy; if (m[ny][nx] === '¯' && !seen[ny * W + nx]) { seen[ny * W + nx] = 1; st.push([nx, ny]); } } }
      if (k < 2 || k > 16) fail(tag + ` kvicksandsfläck om ${k} rutor vid ${x},${y}`); // fläckar om 2-8 som kan ligga intill varandra
      s.qsPatches = (s.qsPatches || 0) + 1;
    }
    s.qsOK = (s.qsOK || 0) + 1;
  }
  // rullsten: utlösaren i ena änden av en rak, fri korridor om minst 6 rutor (utanför rummen)
  const bl = lv.boulders || [];
  if (bl.length !== N('¹')) fail(tag + ` boulders ${bl.length} men ${N('¹')} utlösare`);
  for (const b of bl) {
    if (m[b.ty][b.tx] !== '¹' || (b.tx !== b.sx && b.ty !== b.sy)) { fail(tag + ' rullsten ' + JSON.stringify(b)); continue; }
    const len = Math.abs(b.sx - b.tx) + Math.abs(b.sy - b.ty) + 1, ux = Math.sign(b.sx - b.tx), uy = Math.sign(b.sy - b.ty);
    if (len < 6) fail(tag + ` rullstenens korridor ${len} rutor`);
    for (let k = 0; k < len; k++) {
      const x = b.tx + ux * k, y = b.ty + uy * k, c = m[y][x];
      if (isBlock(c) || DOORS.includes(c) || rm[y][x] !== '-' || (k && HAZ.includes(c))) { fail(tag + ` rullstenens korridor är inte fri vid ${x},${y} (${c})`); break; }
    }
    s.boulderLen = (s.boulderLen || 0) + len;
  }
  // ljusschakt: högst 6 rutor, i rum, inomhus, aldrig på hinder
  const bm = lv.beams || [];
  if (bm.length > 6) fail(tag + ' ljusschakt ' + bm.length);
  if (bm.length && !['tomb', 'dungeon', 'courtyard'].includes(biome)) fail(tag + ' ljusschakt i ' + biome);
  for (const { x, y } of bm) if (isBlock(m[y][x]) || rm[y][x] === '-' || (lv.sky && lv.sky[y][x] !== '0')) fail(tag + ` ljusschakt på ${m[y][x]} vid ${x},${y}`);
  s.f7 = s.f7 || {}; s.n7 = s.n7 || {};
  for (const [k, ok] of [['scarabs', N('Õ')], ['mummy', N('Ã')], ['jackal', N('Ê')], ['thief', N('Î')], ['doppel', N('Ô')], ['beams', bm.length], ['glyphs', N('Ì')]].concat(['sarcophagi', 'quicksand', 'boulders', 'bells', 'gambler', 'banker', 'wanderer', 'pages', 'batteries', 'stones'].map(k => [k, N(FEAT[k])]))) {
    s.f7[k] = (s.f7[k] || 0) + (ok ? 1 : 0); s.n7[k] = (s.n7[k] || 0) + ok;
  }
  if (depth >= 2) { s.d2 = (s.d2 || 0) + 1; s.d2bank = (s.d2bank || 0) + (N('ÿ') ? 1 : 0); s.d2bell = (s.d2bell || 0) + (N('³') ? 1 : 0); }
}

// version 8: nya tecken bara där de får finnas, taken, ålar bara i vattnet, vatten/spikar/tidvatten aldrig enda vägen, level.tide
function checkV8(lv, tag, s, biome, px, py, depth) {
  const m = lv.map, H = m.length, W = m[0].length, rm = lv.roomMask;
  const ri = (x, y) => (rm[y][x] === '-' ? -1 : rm[y].charCodeAt(x) - 48), roomOf = (x, y) => lv.rooms[ri(x, y)];
  const n = {}; for (const r of m) for (const c of r) n[c] = (n[c] || 0) + 1;
  const N = c => n[c] || 0;
  for (const c in V8CAP) if (N(c) > V8CAP[c]) fail(tag + ` för många ${c}: ${N(c)}`);
  if (biome === 'sunken') { if (!lv.tide || !Number.isInteger(lv.tide.period) || lv.tide.period < 24 || lv.tide.period > 40) fail(tag + ' level.tide ' + JSON.stringify(lv.tide)); }
  else if (lv.tide !== null) fail(tag + ' level.tide ska vara null utanför sjunkna staden');
  const combat = r => r && ['normal', 'elite', 'exit'].includes(r.type);
  const quiet = r => r && (['shop', 'shrine', 'treasure'].includes(r.type) || (r.type === 'special' && r.arch !== 'challenge'));
  const closed = floodD(m, px, py, c => !isBlock(c) && !SINK.includes(c)), swim = floodD(m, px, py, swimPass);
  const reach = (d, x, y) => N4.some(([dx, dy]) => d[(y + dy) * W + x + dx] >= 0);
  const dw = lv.floors.indexOf('floor_deepwater'), sh = lv.floors.indexOf('floor_shallow'), gi = lv.rooms.findIndex(r => r.type === 'guardian');
  const nb8 = (x, y, set) => [-1, 0, 1].some(dy => [-1, 0, 1].some(dx => (dx || dy) && set.includes(m[y + dy][x + dx])));
  const roomSize = {}; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (ri(x, y) >= 0 && !isWall(m[y][x])) roomSize[ri(x, y)] = (roomSize[ri(x, y)] || 0) + 1;
  const gw = GUARD[lv.guardian] ? GUARD[lv.guardian].wall : '';
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const c = m[y][x];
    if (!'ĄĆĈĊČĎĐĒĔĖĘĚĜĞĠĢËÍÏÓÚÛĀĂfc'.includes(c)) continue;
    const r = ri(x, y) >= 0 ? roomOf(x, y) : null, arch = r ? r.arch : '', inG = ri(x, y) === gi, fi = +lv.floorMask[y][x];
    if ((c === 'Ą' || c === 'Ć') && biome !== 'crystal') fail(tag + ` kristallvägg ${c} i ${biome}`);
    if ((c === 'Ċ' || c === 'Č') && biome !== 'sunken') fail(tag + ` ruinmur/korall ${c} i ${biome}`);
    if (c === 'Ĉ' && lv.guardian !== 'crystalqueen') fail(tag + ' kristalldrottningens vägg utan kristalldrottningen');
    if (c === 'Ď' && lv.guardian !== 'leviathan') fail(tag + ' leviatans vägg utan leviatan');
    if (c === 'Đ') {
      if (biome !== 'sunken' && !(lv.guardian === 'leviathan' && inG)) fail(tag + ` djupt vatten i ${biome}/${arch || 'korridor'} vid ${x},${y}`);
      if (fi !== dw) fail(tag + ` djupt vatten utan floor_deepwater vid ${x},${y}`);
    }
    if (c === 'Ē' && (biome !== 'crystal' || !(combat(r) || (r && r.type === 'treasure')))) fail(tag + ` kristallspikar i ${biome}/${r ? r.type : 'korridor'} vid ${x},${y}`);
    if ((c === 'Ē' || c === 'Ĕ') && N4.some(([dx, dy]) => DOORS.includes(m[y + dy][x + dx]))) fail(tag + ` ${c} i dörröppning vid ${x},${y}`);
    if (c === 'Ė' && (biome !== 'crystal' || !r || (roomSize[ri(x, y)] || 0) < 36 || Math.max(Math.abs(x - px), Math.abs(y - py)) < 3)) fail(tag + ` brytande kristall i ${biome}/${arch || 'korridor'} (${roomSize[ri(x, y)]} rutor) vid ${x},${y}`);
    if (c === 'Ę' && biome !== 'crystal' && !(lv.guardian === 'crystalqueen' && inG)) fail(tag + ` glödkristall i ${biome} vid ${x},${y}`);
    if ((c === 'f' || c === 'c') && biome === 'crystal' && !inG) fail(tag + ` ${c} i kristallgrottorna utanför vaktarens sal vid ${x},${y}`);
    if (c === 'Ĕ' && (biome !== 'sunken' || !nb8(x, y, 'ĐĜÓĔ') || fi !== sh)) fail(tag + ` tidvatten i ${biome} / långt från vattnet / fel golv vid ${x},${y}`);
    if (c === 'Ĝ' && (biome !== 'sunken' || !N4.some(([dx, dy]) => 'ĐĜÓ'.includes(m[y + dy][x + dx])) || fi !== dw)) fail(tag + ` luftbubblor utanför vattnet vid ${x},${y}`);
    if (c === 'Ó' && (biome !== 'sunken' || !combat(r) || fi !== dw || !nb8(x, y, 'ĐĜÓ'))) fail(tag + ` ål utanför vattnet / utanför ett stridsrum vid ${x},${y}`);
    if (c === 'Ě') {
      const islet = N4.every(([dx, dy]) => 'ĐĜÓ'.includes(m[y + dy][x + dx]));
      if (biome !== 'sunken' || !r || ['guardian', 'secret', 'vault', 'start', 'shop'].includes(r.type)) fail(tag + ` vrakkista i ${biome}/${r ? r.type : 'korridor'} vid ${x},${y}`);
      if (!reach(closed, x, y) && !(islet && reach(swim, x, y))) fail(tag + ` vrakkistan nås inte vid ${x},${y}`);
      if (islet) s.islet = (s.islet || 0) + 1;
    }
    if (c === 'Ğ' && !(quiet(r) || (r && r.type === 'start'))) fail(tag + ` kartografen i ${r ? r.type + '/' + arch : 'korridor'} vid ${x},${y}`);
    if (c === 'Ġ' && !(quiet(r) || (r && r.type === 'start'))) fail(tag + ` talangaltare i ${r ? r.type + '/' + arch : 'korridor'} vid ${x},${y}`);
    if ((c === 'Ğ' || c === 'Ġ') && !reach(closed, x, y)) fail(tag + ` ${c} nås inte från någon sida vid ${x},${y}`);
    if (c === 'Ģ' && (!r || ['guardian', 'shop', 'start'].includes(r.type))) fail(tag + ` kunskapsbok i ${r ? r.type : 'korridor'} vid ${x},${y}`);
    if ('ĀĂËÍÏÚÛ'.includes(c) && !combat(r)) fail(tag + ` ny fiende ${c} i ${r ? r.type : 'korridor'}`);
  }
  if (gw && lv.guardian === 'leviathan') { // leviatans sal: en bassäng om minst 5 rutor
    let k = 0; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (ri(x, y) === gi && m[y][x] === 'Đ') k++;
    if (k < 5) fail(tag + ' leviatans sal saknar bassäng (' + k + ')');
  }
  // vatten, spikar och tidvatten: med dem som vägg nås x, vaktaren och varje ruta i alla rum utom valv och hemliga rum (vattenskatten nås simmande)
  if (N('Đ') + N('Ē') + N('Ĕ')) {
    const X = findCh(m, 'x'), Zc = findCh(m, 'Z');
    if (!X || closed[X[1] * W + X[0]] < 0) fail(tag + ' vatten/spikar stänger av vägen P->x');
    if (Zc && !reach(closed, Zc[0], Zc[1])) fail(tag + ' vatten/spikar stänger av vaktaren');
    const lost = new Set();
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const c = m[y][x], r = ri(x, y) >= 0 ? roomOf(x, y) : null;
      if (!r || r.type === 'vault' || r.type === 'secret' || isBlock(c) || SINK.includes(c) || (WATER_LOOT.includes(c) && swim[y * W + x] >= 0)) continue;
      if (closed[y * W + x] < 0) lost.add(ri(x, y));
    }
    if (lost.size) fail(tag + ` vatten/spikar stänger av rum ${[...lost].join(',')}`);
    s.wetOK = (s.wetOK || 0) + 1;
  }
  s.f8 = s.f8 || {}; s.n8 = s.n8 || {};
  for (const k of K8) { s.f8[k] = (s.f8[k] || 0) + (N(FEAT[k]) ? 1 : 0); s.n8[k] = (s.n8[k] || 0) + N(FEAT[k]); }
  if (depth >= 2) { s.d2s = (s.d2s || 0) + 1; s.d2stalker = (s.d2stalker || 0) + (N('Ā') ? 1 : 0); }
  if (depth >= 3) { s.d3 = (s.d3 || 0) + 1; s.d3witch = (s.d3witch || 0) + (N('Ă') ? 1 : 0); }
}

// kristallgrottorna: väggar Ą med ådror Ć (vaktarens sal i sitt tecken), kristallgolv, kall blåviolett dimma, lågt ljus, glödkristaller,
// inga eldfat/lava/vatten/is
const CRYSTAL_ARCH = ['geode', 'prismhall', 'shardfield', 'grotto', 'mushroom', 'boneden', 'camp', 'prison', 'armory'];
function checkCrystal(lv, tag) {
  const m = lv.map, H = m.length, W = m[0].length, gw = GUARD[lv.guardian].wall, walls = new Set();
  for (const r of m) for (const c of r) if (isWall(c)) walls.add(c);
  for (const c of walls) if (c !== 'Ą' && c !== 'Ć' && c !== gw) fail(tag + ' kristallgrottorna har väggen ' + c);
  if (m[0].replace(/[ĄĆ]/g, '') !== '' || m.some(r => !'ĄĆ'.includes(r[0]) || !'ĄĆ'.includes(r[r.length - 1]))) fail(tag + ' kanten är inte Ą/Ć');
  if (lv.floors[0] !== 'floor_crystal' || lv.floor !== 'floor_crystal' || lv.ceil !== 'ceil_cave' || lv.theme !== 'crystal' || lv.secretWall !== 'Ą' || lv.sky !== null) fail(tag + ' golv/tak/tema ' + lv.floors.join() + ' ' + lv.ceil);
  if (!/^(KRISTALLGROTTORNA|GLITTERSALEN|PRISMAGRUVAN|AMETISTDJUPET|DE SJUNGANDE KRISTALLERNA|SKÄRVGÅNGARNA)$/.test(lv.name)) fail(tag + ' namn ' + lv.name);
  if (!(lv.fog[2] > lv.fog[0] && lv.fog[0] > lv.fog[1] && lv.fog[2] >= 26)) fail(tag + ' dimman är inte kall blåviolett ' + lv.fog);
  if (count(m, 'Ę') < 1) fail(tag + ' inga glödkristaller');
  if (count(m, '_') || count(m, ':') || count(m, '-') || count(m, 'Ç') || count(m, 'Ĕ') || (lv.guardian !== 'leviathan' && count(m, 'Đ'))) fail(tag + ' lava/is/vatten i kristallgrottorna'); // (leviatans sal har sin bassäng)
  let face = 0; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if ('ĄĆ'.includes(m[y][x]) && N4.some(([dx, dy]) => m[y + dy] && m[y + dy][x + dx] !== undefined && !isWall(m[y + dy][x + dx]))) face++;
  const veins = count(m, 'Ć');
  if (!veins || veins > face * 0.35) fail(tag + ` kristallådror ${veins} av ${face} synliga väggrutor`);
  if (lv.guardian === 'crystalqueen' && count(m, 'Ĉ') < 20) fail(tag + ' kristalldrottningens sal saknar väggar Ĉ');
  lv.rooms.forEach(r => { if (!CRYSTAL_ARCH.includes(r.arch) && ['normal', 'elite', 'exit'].includes(r.type)) fail(tag + ` rumstyp ${r.arch} i kristallgrottorna`); });
  const st = B.crystal;
  st.veins = (st.veins || 0) + veins / Math.max(1, face); st.glow = (st.glow || 0) + count(m, 'Ę'); st.prism = (st.prism || 0) + count(m, 'Ė'); st.spk = (st.spk || 0) + count(m, 'Ē');
  st.spkL = (st.spkL || 0) + (count(m, 'Ē') ? 1 : 0); st.prismL = (st.prismL || 0) + (count(m, 'Ė') ? 1 : 0);
}

// sjunkna staden: ruinmur Ċ och korall Č (vaktarens sal i sitt tecken), torg under himlen, plattgolv, djupt vatten (minst 12 rutor) med
// floor_deepwater, tidvatten med floor_shallow, grönblå dimma, level.tide, inga lava/is/vanligt vatten
const SUNKEN_ARCH = ['cistern', 'drownedhall', 'wreckhall', 'coralgrotto', 'storeroom', 'library', 'crypt', 'prison', 'plaza', 'statues', 'armory'];
function checkSunken(lv, tag) {
  const m = lv.map, H = m.length, W = m[0].length, gw = GUARD[lv.guardian].wall, walls = new Set();
  for (const r of m) for (const c of r) if (isWall(c)) walls.add(c);
  for (const c of walls) if (c !== 'Ċ' && c !== 'Č' && c !== gw) fail(tag + ' sjunkna staden har väggen ' + c);
  if (m[0].replace(/[ĊČ]/g, '') !== '' || m.some(r => !'ĊČ'.includes(r[0]) || !'ĊČ'.includes(r[r.length - 1]))) fail(tag + ' kanten är inte Ċ/Č');
  if (lv.floors[0] !== 'floor_sunken_tiles' || lv.floor !== 'floor_sunken_tiles' || lv.ceil !== 'floor_stone' || lv.theme !== 'sunken' || lv.secretWall !== 'Ċ' || !lv.floors.includes('floor_deepwater')) fail(tag + ' golv/tak/tema ' + lv.floors.join() + ' ' + lv.ceil);
  if (!/^(DEN SJUNKNA STADEN|DE DRUNKNADES GATOR|KORALLTEMPLET|TIDVATTENSHAMNEN|DEN ÖVERSVÄMMADE KATEDRALEN|DJUPETS KVARTER)$/.test(lv.name)) fail(tag + ' namn ' + lv.name);
  if (!(lv.fog[2] >= lv.fog[1] && lv.fog[1] > lv.fog[0] + 5)) fail(tag + ' dimman är inte grönblå ' + lv.fog);
  const wet = count(m, 'Đ') + count(m, 'Ĝ') + count(m, 'Ó');
  if (wet < 12) fail(tag + ' för lite djupt vatten ' + wet);
  if (count(m, '_') || count(m, ':') || count(m, '-') || count(m, 'Ç') || count(m, 'Ē') || count(m, 'Ė')) fail(tag + ' lava/is/vanligt vatten/kristaller i sjunkna staden');
  const yards = lv.rooms.map((r, i) => [r, i]).filter(([r]) => r.tag === 'yard');
  if (!yards.length) fail(tag + ' inga torg');
  for (const [r, i] of yards) {
    let k = 0, sky = 0;
    for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) if (lv.roomMask[y].charCodeAt(x) - 48 === i) { k++; if (lv.sky[y][x] === '1') sky++; }
    if (sky < k) fail(tag + ` torg ${i}: himmel ${sky}/${k}`);
  }
  lv.rooms.forEach((r, i) => {
    if (!SUNKEN_ARCH.includes(r.arch) && ['normal', 'elite', 'exit'].includes(r.type)) fail(tag + ` rumstyp ${r.arch} i sjunkna staden`);
    if (r.tag !== 'yard') for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) if (lv.roomMask[y].charCodeAt(x) - 48 === i && lv.sky[y][x] === '1') { fail(tag + ` himmel i salen ${i} (${r.arch})`); return; }
  });
  if (lv.guardian === 'leviathan' && count(m, 'Ď') < 20) fail(tag + ' leviatans sal saknar väggar Ď');
  const st = B.sunken;
  st.wet = (st.wet || 0) + wet; st.tide = (st.tide || 0) + count(m, 'Ĕ'); st.coral = (st.coral || 0) + count(m, 'Č'); st.eels = (st.eels || 0) + count(m, 'Ó');
  st.eelL = (st.eelL || 0) + (count(m, 'Ó') ? 1 : 0); st.wreck = (st.wreck || 0) + count(m, 'Ě'); st.bub = (st.bub || 0) + count(m, 'Ĝ'); st.tideL = (st.tideL || 0) + (count(m, 'Ĕ') ? 1 : 0);
}

// gravkammaren: väggar av sandsten È (hieroglyfer Ì, vaktarens salar i sitt tecken), gårdar under ökensolen, sandgolv i korridorer och
// på gårdar, guldplattor i gravkamrarna, varm dimma, sarkofager 2-5, ingen lava/is/vatten
const TOMB_ARCH = ['burialchamber', 'pillarhall', 'treasury', 'sandtunnel', 'sandcourt', 'trap', 'crypt', 'storeroom', 'gas', 'statues', 'prison', 'armory']; // fängelse/vapenkammare: fångburen och städet
function checkTomb(lv, tag, opts) {
  const m = lv.map, H = m.length, W = m[0].length, gw = GUARD[lv.guardian].wall, walls = new Set();
  for (const r of m) for (const c of r) if (isWall(c)) walls.add(c);
  for (const c of walls) if (c !== 'È' && c !== 'Ì' && c !== gw) fail(tag + ' gravkammaren har väggen ' + c);
  if (m[0].replace(/È/g, '') !== '' || m.some(r => r[0] !== 'È' || r[r.length - 1] !== 'È')) fail(tag + ' kanten är inte È');
  if (lv.floors[0] !== 'floor_sand' || lv.floor !== 'floor_sand' || lv.ceil !== 'floor_sand' || lv.theme !== 'tomb' || lv.secretWall !== 'È') fail(tag + ' golv/tak/tema ' + lv.floors.join() + ' ' + lv.ceil);
  if (!/^(GRAVKAMMAREN|DEN SJUNKNA GRAVEN|FARAONENS VALV|SANDHALLARNA|DE GYLLENE KAMRARNA|SKARABÉGROTTAN)$/.test(lv.name)) fail(tag + ' namn ' + lv.name);
  if (!(lv.fog[0] > lv.fog[1] && lv.fog[1] > lv.fog[2] && lv.fog[0] >= 28)) fail(tag + ' dimman är inte varm ' + lv.fog);
  const sand = 0, gold = lv.floors.indexOf('floor_gold_tiles'), yards = lv.rooms.map((r, i) => [r, i]).filter(([r]) => r.tag === 'yard');
  if (!yards.length) fail(tag + ' inga gårdar');
  for (const [r, i] of yards) {
    let n = 0, sky = 0, sn = 0;
    for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) if (lv.roomMask[y].charCodeAt(x) - 48 === i) { n++; if (lv.sky[y][x] === '1') sky++; if (+lv.floorMask[y][x] === sand) sn++; }
    if (sky < n || sn < n * 0.6) fail(tag + ` gård ${i}: himmel ${sky}/${n}, sand ${sn}/${n}`);
  }
  lv.rooms.forEach((r, i) => {
    if (!TOMB_ARCH.includes(r.arch) && ['normal', 'elite', 'exit'].includes(r.type)) fail(tag + ` rumstyp ${r.arch} i gravkammaren`);
    let n = 0, gn = 0;
    for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) if (lv.roomMask[y].charCodeAt(x) - 48 === i) {
      if (r.tag !== 'yard' && lv.sky[y][x] === '1') { fail(tag + ` himmel i salen ${i} (${r.arch})`); return; }
      if (!isWall(m[y][x])) { n++; if (+lv.floorMask[y][x] === gold) gn++; }
    }
    if ((r.arch === 'burialchamber' || r.arch === 'treasury') && (gold < 0 || gn < n * 0.9)) fail(tag + ` ${r.arch} ${i} utan guldplattor (${gn}/${n})`);
  });
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) if (lv.roomMask[y][x] === '-' && !isWall(m[y][x]) && +lv.floorMask[y][x] !== sand) { fail(tag + ` korridoren saknar sand vid ${x},${y}`); break; }
  const nS = count(m, '²');
  if (nS < 2 || nS > 5) fail(tag + ' sarkofager ' + nS);
  if (count(m, '_') || count(m, ':') || count(m, '-') || count(m, 'Ç')) fail(tag + ' lava/is/vatten/istappar i gravkammaren');
  if (lv.guardian === 'pharaoh' && count(m, 'Ù') < 30) fail(tag + ' faraonens sal saknar väggar Ù');
  const st = B.tomb;
  st.yards = (st.yards || 0) + yards.length; st.glyph = (st.glyph || 0) + count(m, 'Ì'); st.qs = (st.qs || 0) + count(m, '¯'); st.qsL = (st.qsL || 0) + (count(m, '¯') ? 1 : 0);
  st.sarc = (st.sarc || 0) + nS; st.burial = (st.burial || 0) + lv.rooms.filter(r => r.arch === 'burialchamber').length;
  st.pillar = (st.pillar || 0) + lv.rooms.filter(r => r.arch === 'pillarhall').length;
}

// version 9: nya tecken bara där de får finnas, taken, sågspår (level.saws) och vindrutor (level.winds) som stämmer med kartan,
// tidsbubblor i rum, kuggspindlar i hela grupper, molnjättar i stora rum, tomrummet bara i molnborgen (allt nås utan att gå på det)
function checkV9(lv, tag, s, biome, px, py, depth) {
  const m = lv.map, H = m.length, W = m[0].length, rm = lv.roomMask;
  const ri = (x, y) => (rm[y][x] === '-' ? -1 : rm[y].charCodeAt(x) - 48), roomOf = (x, y) => lv.rooms[ri(x, y)];
  const n = {}; for (const r of m) for (const c of r) n[c] = (n[c] || 0) + 1;
  const N = c => n[c] || 0;
  for (const c in V9CAP) if (N(c) > V9CAP[c]) fail(tag + ` för många ${c}: ${N(c)}`);
  const combat = r => r && ['normal', 'elite', 'exit'].includes(r.type);
  const quiet = r => r && (['shop', 'shrine', 'treasure'].includes(r.type) || (r.type === 'special' && r.arch !== 'challenge'));
  const closed = floodD(m, px, py, c => !isBlock(c) && !SINK.includes(c));
  const reach = (x, y) => N4.some(([dx, dy]) => closed[(y + dy) * W + x + dx] >= 0);
  const gi = lv.rooms.findIndex(r => r.type === 'guardian'), clk = biome === 'clock', sk = biome === 'sky';
  const VF = lv.floors.indexOf('floor_void'), WF = lv.floors.indexOf('floor_wind');
  const roomSize = {}; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (ri(x, y) >= 0 && !isWall(m[y][x])) roomSize[ri(x, y)] = (roomSize[ri(x, y)] || 0) + 1;
  if (!Array.isArray(lv.saws) || !Array.isArray(lv.winds)) { fail(tag + ' level.saws/level.winds saknas'); return; }
  // sågspåren: raka, 3-7 rutor, täcker exakt kartans Ŀ
  const cov = new Set();
  for (const sw of lv.saws) {
    const { x0, y0, x1, y1 } = sw, len = Math.abs(x1 - x0) + Math.abs(y1 - y0) + 1, ux = Math.sign(x1 - x0), uy = Math.sign(y1 - y0);
    if ((x0 !== x1 && y0 !== y1) || len < 3 || len > 7) { fail(tag + ' sågspår ' + JSON.stringify(sw)); continue; }
    for (let k = 0; k < len; k++) { const x = x0 + ux * k, y = y0 + uy * k; if (m[y][x] !== 'Ŀ' || cov.has(y * W + x)) fail(tag + ` sågspåret går utanför Ŀ / överlappar vid ${x},${y}`); cov.add(y * W + x); }
    s.sawLen = (s.sawLen || 0) + len;
  }
  if (cov.size !== N('Ŀ')) fail(tag + ` level.saws täcker ${cov.size} av ${N('Ŀ')} Ŀ`);
  // vindrutorna: en post per ń, fyra riktningar, vinden blåser aldrig ut i tomrummet eller in i ett hinder
  const wseen = new Set();
  for (const wd of lv.winds) {
    const { x, y, dx, dy } = wd;
    if (Math.abs(dx) + Math.abs(dy) !== 1 || m[y][x] !== 'ń' || wseen.has(y * W + x)) { fail(tag + ' vindruta ' + JSON.stringify(wd)); continue; }
    wseen.add(y * W + x);
    if (isBlock(m[y + dy][x + dx])) fail(tag + ` vinden blåser ut i ${m[y + dy][x + dx]} vid ${x},${y}`);
  }
  if (wseen.size !== N('ń')) fail(tag + ` level.winds har ${wseen.size} av ${N('ń')} ń`);
  const sp = {};
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const c = m[y][x];
    if (!'ĹĺĻļĽľĿŀŃńŅņŇňŊŋĳĴĵĶķĸ'.includes(c)) continue;
    const r = ri(x, y) >= 0 ? roomOf(x, y) : null, arch = r ? r.arch : '', inG = ri(x, y) === gi, fi = +lv.floorMask[y][x];
    if ((c === 'Ĺ' || c === 'ĺ') && !clk) fail(tag + ` mässingsvägg ${c} i ${biome}`);
    if ((c === 'ļ' || c === 'Ľ') && !sk) fail(tag + ` molnsten/stormmur ${c} i ${biome}`);
    if (c === 'Ļ' && lv.guardian !== 'clockmaker') fail(tag + ' urmakarens vägg utan urmakaren');
    if (c === 'ľ' && lv.guardian !== 'thunderbird') fail(tag + ' stormfågelns vägg utan stormfågeln');
    if ('ĿŀŇĳĴĵ'.includes(c) && !clk) fail(tag + ` ${c} i ${biome}`);
    if ('ŃńňĶķĸ'.includes(c) && !sk) fail(tag + ` ${c} i ${biome}`);
    if (c === 'Ņ' && !(clk ? !inG || lv.guardian === 'clockmaker' : lv.guardian === 'clockmaker' && inG)) fail(tag + ` urverk i ${biome}/${arch || 'korridor'} vid ${x},${y}`);
    if (c === 'ņ' && !(sk ? !inG || lv.guardian === 'thunderbird' : lv.guardian === 'thunderbird' && inG)) fail(tag + ` blixtstång i ${biome}/${arch || 'korridor'} vid ${x},${y}`);
    if ('Ŀŀń'.includes(c) && N4.some(([dx, dy]) => DOORS.includes(m[y + dy][x + dx]))) fail(tag + ` ${c} i dörröppning vid ${x},${y}`);
    if (c === 'Ŀ' && (inG || (r && !combat(r) && r.type !== 'treasure' && !['start', 'shrine', 'special'].includes(r.type)))) fail(tag + ` sågspår i ${r ? r.type : 'korridor'} vid ${x},${y}`);
    if (c === 'ŀ') {
      if (!(combat(r) || (r && r.type === 'treasure')) || Math.max(Math.abs(x - px), Math.abs(y - py)) < 4) fail(tag + ` tidsbubbla i ${r ? r.type : 'korridor'} vid ${x},${y}`);
      (sp.b = sp.b || []).push([x, y]);
    }
    if (c === 'Ń' && VF >= 0 && fi !== VF) fail(tag + ` tomrum utan floor_void vid ${x},${y}`);
    if (c === 'ń' && (fi !== WF || r)) fail(tag + ` vindruta utanför en bro / utan floor_wind vid ${x},${y}`);
    if ((c === 'Ň' || c === 'ň') && !reach(x, y)) fail(tag + ` ${c} nås inte från någon sida vid ${x},${y}`);
    if (c === 'Ň' && !(quiet(r) || combat(r) || (r && r.type === 'start'))) fail(tag + ` klockspel i ${r ? r.type + '/' + arch : 'korridor'} vid ${x},${y}`);
    if (c === 'ň' && (!r || ['guardian', 'secret', 'vault', 'start', 'shop', 'special'].includes(r.type))) fail(tag + ` molnkista i ${r ? r.type : 'korridor'} vid ${x},${y}`);
    if ((c === 'Ŋ' || c === 'ŋ') && (!r || ['guardian', 'shop', 'start'].includes(r.type))) fail(tag + ` ${c} i ${r ? r.type : 'korridor'} vid ${x},${y}`);
    if ('ĳĴĵĶķĸ'.includes(c) && !combat(r)) fail(tag + ` ny fiende ${c} i ${r ? r.type : 'korridor'}`);
    if (c === 'Ĵ') sp[ri(x, y)] = (sp[ri(x, y)] || 0) + 1;
    if (c === 'ĸ' && (depth < 3 || (roomSize[ri(x, y)] || 0) < 30)) fail(tag + ` molnjätte (djup ${depth}) i ett rum om ${roomSize[ri(x, y)]} rutor vid ${x},${y}`);
  }
  for (const k in sp) if (k !== 'b' && (sp[k] < 3 || sp[k] > 5)) fail(tag + ` kuggspindlar i rum ${k}: ${sp[k]} (väntat en grupp om 3-5)`);
  const bub = sp.b || [];
  for (let i = 0; i < bub.length; i++) for (let j = i + 1; j < bub.length; j++) if (Math.max(Math.abs(bub[i][0] - bub[j][0]), Math.abs(bub[i][1] - bub[j][1])) < 5) fail(tag + ' tidsbubblorna ligger för nära varandra');
  // sågspår och tidsbubblor aldrig enda vägen (Ŀ ŀ som vägg: P->x, vaktaren och varje ruta i rummen utom valv/hemliga rum nås ändå;
  // checkRooms räknar dem som lava); tomrummet: allt gångbart nås från P utan att gå på det (isBlock)
  if (N('Ŀ') + N('ŀ')) {
    const X = findCh(m, 'x'), Zc = findCh(m, 'Z');
    if (!X || closed[X[1] * W + X[0]] < 0) fail(tag + ' sågspår/tidsbubblor stänger av vägen P->x');
    if (Zc && !reach(Zc[0], Zc[1])) fail(tag + ' sågspår/tidsbubblor stänger av vaktaren');
    s.sawOK = (s.sawOK || 0) + 1;
  }
  if (N('Ń')) {
    const d = floodD(m, px, py, c => !isBlock(c) || GATES.includes(c));
    let lost = 0; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (!isBlock(m[y][x]) && d[y * W + x] < 0) lost++;
    if (lost) fail(tag + ` ${lost} rutor nås bara över tomrummet`);
    s.voidOK = (s.voidOK || 0) + 1;
  }
  s.f9 = s.f9 || {}; s.n9 = s.n9 || {};
  for (const k of K9) { s.f9[k] = (s.f9[k] || 0) + (N(FEAT[k]) ? 1 : 0); s.n9[k] = (s.n9[k] || 0) + N(FEAT[k]); }
  s.f9.sawTracks = (s.f9.sawTracks || 0) + (lv.saws.length ? 1 : 0); s.n9.sawTracks = (s.n9.sawTracks || 0) + lv.saws.length;
  if (depth >= 3) { s.d3v9 = (s.d3v9 || 0) + 1; s.d3giant = (s.d3giant || 0) + (N('ĸ') ? 1 : 0); }
}

// version 10: de nya fienderna (biom och djup kontrolleras i checkLevel via NEW_BIOME/NEW_DEPTH; här tak, i stridsrum, grävaren aldrig
// intill vatten, rotvättar i grupper om 2-3, armborstskyttar vid skydd, paddjättar nära vatten) och legendaltaret (djup 2+, lugnt rum,
// fri framsida, nås med grindarna stängda, påverkar inte nåbarheten: med Œ som golv nås exakt en ruta till)
const COVER10 = 'TeHJkquv²µßĖ';
function checkV10(lv, tag, s, biome, px, py, depth) {
  const m = lv.map, H = m.length, W = m[0].length, rm = lv.roomMask;
  const ri = (x, y) => (rm[y][x] === '-' ? -1 : rm[y].charCodeAt(x) - 48), roomOf = (x, y) => lv.rooms[ri(x, y)];
  const n = {}; for (const r of m) for (const c of r) n[c] = (n[c] || 0) + 1;
  const N = c => n[c] || 0;
  for (const c in V10CAP) if (N(c) > V10CAP[c]) fail(tag + ` för många ${c}: ${N(c)}`);
  const at = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? '1' : m[y][x]);
  const combat = r => r && ['normal', 'elite', 'exit'].includes(r.type);
  const quiet = r => r && (['shrine', 'treasure', 'start'].includes(r.type) || (r.type === 'special' && r.arch !== 'challenge'));
  const wet = c => c === '-' || 'ĐĔĜÓ'.includes(c);
  const pillar = (x, y) => isWall(at(x, y)) && x > 0 && y > 0 && x < W - 1 && y < H - 1 && [-1, 0, 1].reduce((k, dy) => k + [-1, 0, 1].filter(dx => (dx || dy) && !isWall(at(x + dx, y + dy))).length, 0) >= 5;
  const near = (x, y, rad, f) => { for (let dy = -rad; dy <= rad; dy++) for (let dx = -rad; dx <= rad; dx++) if ((dx || dy) && f(x + dx, y + dy)) return true; return false; };
  const roots = {};
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const c = m[y][x];
    if (c !== 'Œ' && !V10EN.includes(c)) continue;
    const r = ri(x, y) >= 0 ? roomOf(x, y) : null;
    if (c === 'Œ') {
      if (depth < 2 || !quiet(r)) fail(tag + ` legendaltare på djup ${depth} i ${r ? r.type + '/' + r.arch : 'korridor'} vid ${x},${y}`);
      if (!N4.some(([dx, dy]) => !isBlock(at(x + dx, y + dy)) && !HAZ.includes(at(x + dx, y + dy)))) fail(tag + ` legendaltaret saknar fri framsida vid ${x},${y}`);
      // nåbarheten: med grindarna stängda, utan lava/spikar; med Œ som golv nås exakt en ruta till (altarets egen)
      const pass = c2 => !isBlock(c2) && !SINK.includes(c2), cnt = d => d.reduce((k, v) => k + (v >= 0 ? 1 : 0), 0);
      const with_ = floodD(m, px, py, pass), m2 = m.slice(); m2[y] = m2[y].slice(0, x) + '.' + m2[y].slice(x + 1);
      if (cnt(floodD(m2, px, py, pass)) !== cnt(with_) + 1) fail(tag + ` legendaltaret stänger av något / nås inte vid ${x},${y}`);
      s.altarRoom = s.altarRoom || {}; s.altarRoom[r ? r.type : '-'] = (s.altarRoom[r ? r.type : '-'] || 0) + 1;
      continue;
    }
    if (!combat(r)) fail(tag + ` ny fiende ${c} i ${r ? r.type : 'korridor'} vid ${x},${y}`);
    if (c === 'ō' && N4.some(([dx, dy]) => wet(at(x + dx, y + dy)))) fail(tag + ` grävare intill vatten vid ${x},${y}`);
    if (c === 'ŏ') roots[ri(x, y)] = (roots[ri(x, y)] || 0) + 1;
    if (c === 'Ő') { s.xbowN = (s.xbowN || 0) + 1; if (near(x, y, 1, (xx, yy) => COVER10.includes(at(xx, yy)) || pillar(xx, yy))) s.xbowCover = (s.xbowCover || 0) + 1; }
    if (c === 'ő') { s.toadN = (s.toadN || 0) + 1; if (near(x, y, 2, (xx, yy) => wet(at(xx, yy)))) s.toadWet = (s.toadWet || 0) + 1; }
  }
  for (const k in roots) if (roots[k] < 2 || roots[k] > 3) fail(tag + ` rotvättar i rum ${k}: ${roots[k]} (väntat en grupp om 2-3)`);
  s.f10 = s.f10 || {}; s.n10 = s.n10 || {}; s.e10 = s.e10 || {};
  for (const c of V10EN + 'Œ') {
    if (depth < (c === 'Œ' ? 2 : NEW_DEPTH[c])) continue; // andel bland banorna där saken får finnas
    s.e10[c] = (s.e10[c] || 0) + 1; s.f10[c] = (s.f10[c] || 0) + (N(c) ? 1 : 0); s.n10[c] = (s.n10[c] || 0) + N(c);
  }
}

// klocktornet: mässingsväggar Ĺ med kuggväggar ĺ (vaktarens sal i sitt tecken), inomhus, mässingsgolv, varm dimma, urverk, sågspår och
// tidsbubblor, inget tomrum/lava/vatten/is
const CLOCK_ARCH = ['gearworks', 'pendulumhall', 'workshop', 'storeroom', 'armory', 'library', 'prison', 'crypt'];
function checkClock(lv, tag) {
  const m = lv.map, H = m.length, W = m[0].length, gw = GUARD[lv.guardian].wall, walls = new Set();
  for (const r of m) for (const c of r) if (isWall(c)) walls.add(c);
  for (const c of walls) if (c !== 'Ĺ' && c !== 'ĺ' && c !== gw) fail(tag + ' klocktornet har väggen ' + c);
  if (m[0].replace(/[Ĺĺ]/g, '') !== '' || m.some(r => !'Ĺĺ'.includes(r[0]) || !'Ĺĺ'.includes(r[r.length - 1]))) fail(tag + ' kanten är inte Ĺ/ĺ');
  if (lv.floors[0] !== 'floor_brass' || lv.floor !== 'floor_brass' || lv.ceil !== 'floor_brass' || lv.theme !== 'clock' || lv.secretWall !== 'Ĺ' || lv.sky !== null) fail(tag + ' golv/tak/tema ' + lv.floors.join() + ' ' + lv.ceil);
  if (!/^(KLOCKTORNET|URVERKET|PENDELSALEN|KUGGARNAS GÅNGAR|TIDENS VALV|URMAKARENS VERKSTAD)$/.test(lv.name)) fail(tag + ' namn ' + lv.name);
  if (!(lv.fog[0] > lv.fog[1] && lv.fog[1] > lv.fog[2] && lv.fog[0] >= 26)) fail(tag + ' dimman är inte varm mässing ' + lv.fog);
  if (count(m, 'Ņ') < 1 || !count(m, 'ĺ')) fail(tag + ` urverk ${count(m, 'Ņ')} kuggväggar ${count(m, 'ĺ')}`);
  if (count(m, '_') || count(m, ':') || count(m, '-') || count(m, 'Ç') || count(m, 'Ń') || count(m, 'Ĕ') || (lv.guardian !== 'leviathan' && count(m, 'Đ'))) fail(tag + ' lava/is/vatten/tomrum i klocktornet');
  if (lv.guardian === 'clockmaker' && count(m, 'Ļ') < 20) fail(tag + ' urmakarens sal saknar väggar Ļ');
  lv.rooms.forEach(r => { if (!CLOCK_ARCH.includes(r.arch) && ['normal', 'elite', 'exit'].includes(r.type)) fail(tag + ` rumstyp ${r.arch} i klocktornet`); });
  const st = B.clock;
  st.sawN = (st.sawN || 0) + count(m, 'Ŀ'); st.sawL = (st.sawL || 0) + (lv.saws.length ? 1 : 0); st.tracks = (st.tracks || 0) + lv.saws.length;
  st.bub = (st.bub || 0) + count(m, 'ŀ'); st.cw = (st.cw || 0) + count(m, 'Ņ'); st.gw = (st.gw || 0) + count(m, 'ĺ'); st.chime = (st.chime || 0) + count(m, 'Ň');
  st.spid = (st.spid || 0) + (count(m, 'Ĵ') ? 1 : 0);
}

// molnborgen: kanten stormmur Ľ, glesa murar ļ Ľ (vaktarens sal i sitt tecken), allt annat utanför öarna tomrum Ń (floor_void), himmel
// överallt, molngolv, ljus blåvit dimma, inga dörrar D, vindrutor, blixtstänger, molnkistor, ingen lava/vatten/is
const SKY_ARCH = ['cloudisle', 'harpynest', 'stormspire', 'storeroom', 'statues', 'cloudcourt', 'prison', 'armory'];
function checkSky(lv, tag) {
  const m = lv.map, H = m.length, W = m[0].length, gw = GUARD[lv.guardian].wall, walls = new Set();
  for (const r of m) for (const c of r) if (isWall(c)) walls.add(c);
  for (const c of walls) if (c !== 'ļ' && c !== 'Ľ' && c !== gw) fail(tag + ' molnborgen har väggen ' + c);
  if (m[0].replace(/Ľ/g, '') !== '' || m[H - 1].replace(/Ľ/g, '') !== '' || m.some(r => r[0] !== 'Ľ' || r[r.length - 1] !== 'Ľ')) fail(tag + ' kanten är inte Ľ');
  if (lv.floors[0] !== 'floor_cloud' || lv.floor !== 'floor_cloud' || lv.theme !== 'sky' || lv.secretWall !== 'ļ' || !lv.floors.includes('floor_void')) fail(tag + ' golv/tema ' + lv.floors.join());
  if (!lv.sky || lv.sky.some(r => r.includes('0'))) fail(tag + ' molnborgen har tak');
  if (!/^(MOLNBORGEN|STORMENS TINNAR|DE SVÄVANDE ÖARNA|VINDARNAS RIKE|ÅSKANS TRAPPOR|HIMMELSBORGEN)$/.test(lv.name)) fail(tag + ' namn ' + lv.name);
  if (!(lv.fog[2] > lv.fog[1] && lv.fog[1] > lv.fog[0] && lv.fog[0] >= 24)) fail(tag + ' dimman är inte ljus blåvit ' + lv.fog);
  if (count(m, 'D')) fail(tag + ' dörrar D i molnborgen');
  const vd = count(m, 'Ń'), inner = (W - 2) * (H - 2);
  if (vd < inner * 0.3) fail(tag + ` för lite tomrum ${vd}/${inner}`);
  let wl = 0; for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) if (isWall(m[y][x])) wl++;
  if (wl > inner * 0.18) fail(tag + ` för många murar ${wl}/${inner}`);
  if (count(m, '_') || count(m, ':') || count(m, '-') || count(m, 'Ç') || count(m, 'Ĕ') || count(m, 'Ŀ') || (lv.guardian !== 'leviathan' && count(m, 'Đ'))) fail(tag + ' lava/is/vatten/sågspår i molnborgen');
  if (count(m, 'ņ') < 2) fail(tag + ' för få blixtstänger ' + count(m, 'ņ'));
  // vaktarens sal: tomrum längs kanterna men inte i mitten (5x5 runt Z)
  const Zc = findCh(m, 'Z');
  if (Zc) for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (m[Zc[1] + dy][Zc[0] + dx] === 'Ń') fail(tag + ' tomrum i vaktarens fria mitt');
  lv.rooms.forEach(r => { if (!SKY_ARCH.includes(r.arch) && ['normal', 'elite', 'exit'].includes(r.type)) fail(tag + ` rumstyp ${r.arch} i molnborgen`); });
  const gi = lv.rooms.findIndex(r => r.type === 'guardian');
  let gv = 0; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (lv.roomMask[y].charCodeAt(x) - 48 === gi && m[y][x] === 'Ń') gv++;
  // bryggor: broarnas rutor (utanför rummen) har tomrum på minst en sida
  let bridge = 0; for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) if (lv.roomMask[y][x] === '-' && !isBlock(m[y][x]) && N4.some(([dx, dy]) => m[y + dy][x + dx] === 'Ń')) bridge++;
  const st = B.sky;
  st.void = (st.void || 0) + vd / inner; st.walls = (st.walls || 0) + wl; st.wind = (st.wind || 0) + count(m, 'ń'); st.windL = (st.windL || 0) + (count(m, 'ń') ? 1 : 0);
  st.rods = (st.rods || 0) + count(m, 'ņ'); st.chests = (st.chests || 0) + count(m, 'ň'); st.gvoid = (st.gvoid || 0) + gv; st.bridge = (st.bridge || 0) + bridge;
  st.giants = (st.giants || 0) + count(m, 'ĸ');
}

// version 11: nya tecken bara där de får finnas, taken, level.teleports (exakta par i olika rum), studsplattor/sporpölar/teleportrar aldrig
// vid dörrar och aldrig enda vägen (checkRooms räknar dem som lava: med dem som vägg nås allt ändå), spegelväggar 20-35 % av salarnas väggar
// och aldrig på dörrkarmar, sporlingar (3-5) och glasskärvor (2-4) i hela grupper, mycelbestar i stora rum, sporsäckar i rum med byte
// salarnas väggar i spegelpalatset (ringen runt rummets ruta utan hörnen, utom vaktarens sal, valv och hemliga rum): Š eller š
const mirrorRingT = (lv, r) => {
  const out = [], at = (x, y) => (lv.map[y] || '')[x];
  for (let k = 0; k < r.w; k++) out.push([r.x + k, r.y - 1], [r.x + k, r.y + r.h]);
  for (let k = 0; k < r.h; k++) out.push([r.x - 1, r.y + k], [r.x + r.w, r.y + k]);
  return out.filter(([x, y]) => at(x, y) === 'Š' || at(x, y) === 'š');
};
function checkV11(lv, tag, s, biome, px, py, depth) {
  const m = lv.map, H = m.length, W = m[0].length, rm = lv.roomMask;
  const ri = (x, y) => (rm[y][x] === '-' ? -1 : rm[y].charCodeAt(x) - 48), roomOf = (x, y) => lv.rooms[ri(x, y)];
  const n = {}; for (const r of m) for (const c of r) n[c] = (n[c] || 0) + 1;
  const N = c => n[c] || 0;
  for (const c in V11CAP) if (N(c) > V11CAP[c]) fail(tag + ` för många ${c}: ${N(c)}`);
  const at = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? '1' : m[y][x]);
  const combat = r => r && ['normal', 'elite', 'exit'].includes(r.type);
  const near8 = (x, y, f) => [-1, 0, 1].some(dy => [-1, 0, 1].some(dx => (dx || dy) && f(at(x + dx, y + dy))));
  const gi = lv.rooms.findIndex(r => r.type === 'guardian'), fu = biome === 'fungus', mi = biome === 'mirror';
  const roomSize = {}; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (ri(x, y) >= 0 && !isWall(m[y][x])) roomSize[ri(x, y)] = (roomSize[ri(x, y)] || 0) + 1;
  // level.teleports: exakta par av ť i två olika rum, varje ť i exakt ett par
  if (!Array.isArray(lv.teleports)) { fail(tag + ' level.teleports saknas'); return; }
  const tseen = new Set();
  for (const tp of lv.teleports) {
    const { a, b } = tp || {};
    if (!a || !b || at(a.x, a.y) !== 'ť' || at(b.x, b.y) !== 'ť' || tseen.has(a.y * W + a.x) || tseen.has(b.y * W + b.x)) { fail(tag + ' teleporterpar ' + JSON.stringify(tp)); continue; }
    tseen.add(a.y * W + a.x); tseen.add(b.y * W + b.x);
    if (ri(a.x, a.y) < 0 || ri(b.x, b.y) < 0 || ri(a.x, a.y) === ri(b.x, b.y)) fail(tag + ' teleporterparet ligger inte i två olika rum ' + JSON.stringify(tp));
    s.tpDist = (s.tpDist || 0) + Math.hypot(a.x - b.x, a.y - b.y);
  }
  if (tseen.size !== N('ť')) fail(tag + ` level.teleports täcker ${tseen.size} av ${N('ť')} ť`);
  if (mi ? lv.teleports.length < 1 || lv.teleports.length > 3 : lv.teleports.length) fail(tag + ` ${lv.teleports.length} teleporterpar i ${biome}`);
  const grp = { 'ŗ': {}, 'Ŝ': {} };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const c = m[y][x];
    if (!'ŝŞşŠšŢţŤťŦŧŗŘřŚśŜŨ'.includes(c)) continue;
    const r = ri(x, y) >= 0 ? roomOf(x, y) : null, arch = r ? r.arch : '', inG = ri(x, y) === gi;
    if ((c === 'ŝ' || c === 'Ş') && !fu) fail(tag + ` svampvägg ${c} i ${biome}`);
    if ((c === 'Š' || c === 'š') && !mi) fail(tag + ` marmor/spegel ${c} i ${biome}`);
    if (c === 'ş' && lv.guardian !== 'mycelmother') fail(tag + ' mycelmoderns vägg utan mycelmodern');
    if (c === 'Ţ' && lv.guardian !== 'mirrorking') fail(tag + ' spegelkungens vägg utan spegelkungen');
    if ('ţŤŗŘř'.includes(c) && !fu) fail(tag + ` ${c} i ${biome}`);
    if ('ťŚśŜ'.includes(c) && !mi) fail(tag + ` ${c} i ${biome}`);
    if (c === 'Ŧ' && !(fu ? !inG || lv.guardian === 'mycelmother' : lv.guardian === 'mycelmother' && inG)) fail(tag + ` glödsvamp i ${biome}/${arch || 'korridor'} vid ${x},${y}`);
    if (c === 'ŧ' && !(mi ? !inG || lv.guardian === 'mirrorking' : lv.guardian === 'mirrorking' && inG)) fail(tag + ` spegelstaty i ${biome}/${arch || 'korridor'} vid ${x},${y}`);
    if ('ţŤť'.includes(c)) {
      if (near8(x, y, a => DOORS.includes(a))) fail(tag + ` ${c} intill en dörr vid ${x},${y}`);
      if (Math.max(Math.abs(x - px), Math.abs(y - py)) <= 1) fail(tag + ` ${c} intill P vid ${x},${y}`);
      if (!r || inG || ['vault', 'secret', 'shop'].includes(r.type)) fail(tag + ` ${c} i ${r ? r.type : 'korridor'} vid ${x},${y}`);
      if (c === 'Ť' && !(combat(r) || r.type === 'treasure')) fail(tag + ` sporpöl i ${r ? r.type : 'korridor'} vid ${x},${y}`);
    }
    if (c === 'š' && near8(x, y, a => DOORS.includes(a))) fail(tag + ` spegelvägg på en dörrkarm vid ${x},${y}`);
    if (V11EN.includes(c) && !combat(r)) fail(tag + ` ny fiende ${c} i ${r ? r.type : 'korridor'} vid ${x},${y}`);
    if (c === 'ŗ' || c === 'Ŝ') grp[c][ri(x, y)] = (grp[c][ri(x, y)] || 0) + 1;
    if (c === 'Ř' && (depth < 2 || (roomSize[ri(x, y)] || 0) < 30)) fail(tag + ` mycelbest (djup ${depth}) i ett rum om ${roomSize[ri(x, y)]} rutor vid ${x},${y}`);
    if (c === 'Ũ' && (!r || ['guardian', 'shop', 'start'].includes(r.type))) fail(tag + ` sporsäck i ${r ? r.type : 'korridor'} vid ${x},${y}`);
  }
  for (const k in grp['ŗ']) if (grp['ŗ'][k] < 3 || grp['ŗ'][k] > 5) fail(tag + ` sporlingar i rum ${k}: ${grp['ŗ'][k]} (väntat en grupp om 3-5)`);
  for (const k in grp['Ŝ']) if (grp['Ŝ'][k] < 2 || grp['Ŝ'][k] > 4) fail(tag + ` glasskärvor i rum ${k}: ${grp['Ŝ'][k]} (väntat en grupp om 2-4)`);
  // studsplattor, sporpölar och teleportrar aldrig enda vägen: med dem som vägg nås x och vaktaren (checkRooms: varje ruta)
  if (N('ţ') + N('Ť') + N('ť')) {
    const closed = floodD(m, px, py, c => !isBlock(c) && !SINK.includes(c)), X = findCh(m, 'x'), Zc = findCh(m, 'Z');
    if (!X || closed[X[1] * W + X[0]] < 0) fail(tag + ' studsplattor/sporpölar/teleportrar stänger av vägen P->x');
    if (Zc && !N4.some(([dx, dy]) => closed[(Zc[1] + dy) * W + Zc[0] + dx] >= 0)) fail(tag + ' studsplattor/sporpölar/teleportrar stänger av vaktaren');
    s.sinkOK11 = (s.sinkOK11 || 0) + 1;
  }
  // spegelväggarnas andel av salarnas väggar
  if (mi) {
    let tot = 0, mir = 0;
    for (const r of lv.rooms) if (!['guardian', 'secret', 'vault'].includes(r.type)) for (const [x, y] of mirrorRingT(lv, r)) { tot++; if (m[y][x] === 'š') mir++; }
    const share = mir / Math.max(1, tot);
    if (share < 0.2 || share > 0.35 || mir !== N('š')) fail(tag + ` spegelväggar ${mir}/${tot} (${(100 * share).toFixed(0)} %) av salarnas väggar, ${N('š')} på kartan`);
    s.mirShare = (s.mirShare || 0) + share;
  }
  s.f11 = s.f11 || {}; s.n11 = s.n11 || {};
  for (const k of K11) { s.f11[k] = (s.f11[k] || 0) + (N(FEAT[k]) ? 1 : 0); s.n11[k] = (s.n11[k] || 0) + N(FEAT[k]); }
  if (depth >= 2) { s.d2v11 = (s.d2v11 || 0) + 1; s.d2brute = (s.d2brute || 0) + (N('Ř') ? 1 : 0); s.d2illu = (s.d2illu || 0) + (N('ś') ? 1 : 0); }
}

// svampriket: svampväggar ŝ med glesa svamphattar Ş (vaktarens sal i sitt tecken), inomhus, mossgolv, grön-lila dimma, glödsvampar i stället för
// eldfat, studsplattor (1-4) och sporpölar, inga lava/is/vatten/tomrum/sågspår
const FUNGUS_ARCH = ['sporegrotto', 'giantcaps', 'myceliumden', 'mushroom', 'boneden', 'camp', 'nest', 'prison'];
function checkFungus(lv, tag) {
  const m = lv.map, H = m.length, W = m[0].length, gw = GUARD[lv.guardian].wall, walls = new Set();
  for (const r of m) for (const c of r) if (isWall(c)) walls.add(c);
  for (const c of walls) if (c !== 'ŝ' && c !== 'Ş' && c !== gw) fail(tag + ' svampriket har väggen ' + c);
  if (m[0].replace(/[ŝŞ]/g, '') !== '' || m.some(r => !'ŝŞ'.includes(r[0]) || !'ŝŞ'.includes(r[r.length - 1]))) fail(tag + ' kanten är inte ŝ/Ş');
  if (lv.floors[0] !== 'floor_moss' || lv.floor !== 'floor_moss' || lv.ceil !== 'ceil_cave' || lv.theme !== 'fungus' || lv.secretWall !== 'ŝ' || lv.sky !== null) fail(tag + ' golv/tak/tema ' + lv.floors.join() + ' ' + lv.ceil);
  if (!/^(SVAMPRIKET|MYCELDJUPET|SPORGROTTORNA|DE GLÖDANDE HATTARNA|RÖTANS RIKE|JÄTTESVAMPARNAS SKOG)$/.test(lv.name)) fail(tag + ' namn ' + lv.name);
  if (!(lv.fog[1] > lv.fog[2] && lv.fog[2] > lv.fog[0])) fail(tag + ' dimman är inte grön-lila ' + lv.fog);
  const gi = lv.rooms.findIndex(r => r.type === 'guardian');
  let fOut = 0; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if ((m[y][x] === 'f' || m[y][x] === 'c') && lv.roomMask[y].charCodeAt(x) - 48 !== gi) fOut++;
  if (fOut || count(m, 'Ŧ') < 1) fail(tag + ` eldfat/kandelabrar utanför vaktarens sal ${fOut}, glödsvampar ${count(m, 'Ŧ')}`);
  if (count(m, 'ţ') < 1 || count(m, 'ţ') > 4) fail(tag + ' studsplattor ' + count(m, 'ţ'));
  if (!count(m, 'Ş')) fail(tag + ' inga svamphattar Ş');
  if (count(m, '_') || count(m, ':') || count(m, 'Ç') || count(m, 'Ń') || count(m, 'Ŀ') || count(m, 'Ĕ') || (lv.guardian !== 'leviathan' && count(m, 'Đ'))) fail(tag + ' lava/is/tomrum/sågspår i svampriket');
  if (lv.guardian === 'mycelmother' && count(m, 'ş') < 20) fail(tag + ' mycelmoderns sal saknar väggar ş');
  lv.rooms.forEach(r => { if (!FUNGUS_ARCH.includes(r.arch) && ['normal', 'elite', 'exit'].includes(r.type)) fail(tag + ` rumstyp ${r.arch} i svampriket`); });
  // sporpölarnas fläckar (4-grannskap): 2-6 rutor
  const seen = new Set(), patches = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (m[y][x] === 'Ť' && !seen.has(y * W + x)) {
    let k = 0; const st = [[x, y]]; seen.add(y * W + x);
    while (st.length) { const [cx, cy] = st.pop(); k++; for (const [dx, dy] of N4) { const nx = cx + dx, ny = cy + dy; if (m[ny][nx] === 'Ť' && !seen.has(ny * W + nx)) { seen.add(ny * W + nx); st.push([nx, ny]); } } }
    patches.push(k);
  }
  if (patches.some(k => k < 2 || k > 6) || patches.length > 4) fail(tag + ' sporpölsfläckar ' + patches.join());
  const st = B.fungus;
  st.pads = (st.pads || 0) + count(m, 'ţ'); st.pools = (st.pools || 0) + count(m, 'Ť'); st.poolL = (st.poolL || 0) + (count(m, 'Ť') ? 1 : 0); st.patches = (st.patches || 0) + patches.length;
  st.caps = (st.caps || 0) + count(m, 'Ş'); st.shrooms = (st.shrooms || 0) + count(m, 'Ŧ'); st.spl = (st.spl || 0) + (count(m, 'ŗ') ? 1 : 0); st.brutes = (st.brutes || 0) + count(m, 'Ř');
}

// spegelpalatset: marmor Š med spegelväggar š (vaktarens sal i sitt tecken), inomhus, marmorgolv, blek silverviolett dimma, 1-3 teleporterpar,
// spegelstatyer, inga lava/vatten/tomrum/sågspår
const MIRROR_ARCH = ['mirrorhall', 'ballroom', 'gallery', 'library', 'dining', 'chapel', 'storeroom', 'armory', 'prison', 'crypt', 'torture'];
function checkMirror(lv, tag) {
  const m = lv.map, gw = GUARD[lv.guardian].wall, walls = new Set();
  for (const r of m) for (const c of r) if (isWall(c)) walls.add(c);
  for (const c of walls) if (c !== 'Š' && c !== 'š' && c !== gw) fail(tag + ' spegelpalatset har väggen ' + c);
  if (m[0].replace(/[Šš]/g, '') !== '' || m.some(r => !'Šš'.includes(r[0]) || !'Šš'.includes(r[r.length - 1]))) fail(tag + ' kanten är inte Š/š');
  if (lv.floors[0] !== 'floor_marble' || lv.floor !== 'floor_marble' || lv.ceil !== 'floor_marble' || lv.theme !== 'mirror' || lv.secretWall !== 'Š' || lv.sky !== null) fail(tag + ' golv/tak/tema ' + lv.floors.join() + ' ' + lv.ceil);
  if (!/^(SPEGELPALATSET|DE TUSEN SPEGLARNA|MARMORSALARNA|GLASKUNGENS HOV|ILLUSIONERNAS SAL|DEN BRUTNA SPEGELN)$/.test(lv.name)) fail(tag + ' namn ' + lv.name);
  if (!(lv.fog[2] > lv.fog[0] && lv.fog[0] >= lv.fog[1] - 2 && lv.fog[2] >= 28)) fail(tag + ' dimman är inte blek silverviolett ' + lv.fog);
  if (!count(m, 'ŧ') || !count(m, 'š')) fail(tag + ` spegelstatyer ${count(m, 'ŧ')} spegelväggar ${count(m, 'š')}`);
  if (count(m, '_') || count(m, ':') || count(m, 'Ç') || count(m, 'Ń') || count(m, 'Ŀ') || count(m, 'Ĕ') || (lv.guardian !== 'leviathan' && count(m, 'Đ'))) fail(tag + ' lava/is/tomrum/sågspår i spegelpalatset');
  if (lv.guardian === 'mirrorking' && count(m, 'Ţ') < 20) fail(tag + ' spegelkungens sal saknar väggar Ţ');
  lv.rooms.forEach(r => { if (!MIRROR_ARCH.includes(r.arch) && ['normal', 'elite', 'exit'].includes(r.type)) fail(tag + ` rumstyp ${r.arch} i spegelpalatset`); });
  const st = B.mirror;
  st.tp = (st.tp || 0) + lv.teleports.length; st.mw = (st.mw || 0) + count(m, 'š'); st.statues = (st.statues || 0) + count(m, 'ŧ');
  st.shard = (st.shard || 0) + (count(m, 'Ŝ') ? 1 : 0); st.illu = (st.illu || 0) + count(m, 'ś');
}

// ---- fängelsehålan (samma kontroller som tidigare) ----
{
  const TOTAL = Math.max(300, +process.env.GEN_TEST_N || 0);
  let minRooms = 99, maxRooms = 0, rooms = 0;
  for (let i = 0; i < TOTAL; i++) {
    const depth = 1 + (i % 5), seed = (i % 3 === 0) ? 'seed-' + i : 1000 + i * 7919;
    const opts = { shop: i % 2 === 0, weapon: weaponOpts[(i >> 1) % weaponOpts.length], biome: 'dungeon' };
    const [lv, ms] = timed(() => Gen.floor(seed, depth, opts));
    const { tag, types } = checkLevel(lv, seed, depth, opts, 'dungeon');
    B.dungeon.ms.push(ms);
    const nMain = lv.rooms.length - (types.secret || 0) - lv.rooms.filter(r => r.type === 'vault' && r.tag === 'vault').length; // utan utmejslade valv
    if (nMain < 7 || nMain > 15) fail(tag + ' antal rum ' + lv.rooms.length);
    if (types.treasure !== 1) fail(tag + ' skattrum ' + types.treasure);
    rooms += lv.rooms.length; minRooms = Math.min(minRooms, lv.rooms.length); maxRooms = Math.max(maxRooms, lv.rooms.length);
    if (!lv.floorMask.some(r => /[^0]/.test(r))) fail(tag + ' golvmasken används inte (vaktarens golv saknas)');
    const opts2 = Object.assign({}, opts, { guardian: GUARD_IDS[i % GUARD_IDS.length] });
    if (i % 7 === 0 && Gen.floor(seed, depth, opts2).guardian !== opts2.guardian) fail(tag + ' opts.guardian ignoreras');
    if (i % 5 === 0 && JSON.stringify(Gen.floor(seed, depth, opts)) !== JSON.stringify(lv)) fail(tag + ' inte deterministisk');
    if (!samples.dungeon) samples.dungeon = lv;
  }
  B.dungeon.extra = `rum snitt ${(rooms / TOTAL).toFixed(1)} (min ${minRooms}, max ${maxRooms})`;
}

// ---- övriga biomer ----
const PER_BIOME = +process.env.GEN_TEST_N || 75; // GEN_TEST_N=300 för fler banor per biom
for (const biome of BIOME_IDS.slice(1)) {
  for (let i = 0; i < PER_BIOME; i++) {
    const depth = 1 + (i % 5), seed = (i % 3 === 0) ? biome + '-' + i : 2000 + i * 104729;
    // vulkanen med spelets opts: alltid vaktare, butik på position 2 och 4, vapen-id eller null
    const opts = biome === 'volcano' ? { biome, shop: i % 5 === 2 || i % 5 === 4, weapon: GAME_WEAPONS[i % GAME_WEAPONS.length], guardian: GUARD_IDS[i % GUARD_IDS.length] }
      : { biome, shop: i % 2 === 1, weapon: weaponOpts[(i >> 1) % weaponOpts.length], guardian: i % 4 === 3 ? undefined : GUARD_IDS[i % GUARD_IDS.length] };
    const [lv, ms] = timed(() => Gen.floor(seed, depth, opts));
    const { tag } = checkLevel(lv, seed, depth, opts, biome);
    B[biome].ms.push(ms);
    if (i % 5 === 0 && JSON.stringify(Gen.floor(seed, depth, opts)) !== JSON.stringify(lv)) fail(tag + ' inte deterministisk');
    if (biome === 'caves' && /[^8]/.test(lv.map.join('').replace(/[^1-9]/g, ''))) fail(tag + ' grottan har andra väggar än 8 (utom vaktarens)');
    if (opts.guardian && lv.guardian !== opts.guardian) fail(tag + ' opts.guardian ignoreras');
    if (biome === 'forest' && count(lv.map, 't') < 5) fail(tag + ' för få träd');
    const doors = count(lv.map, 'D') + count(lv.map, 'G') + count(lv.map, '|') + count(lv.map, ']');
    if (biome === 'graveyard' && (count(lv.map, 'n') < 15 || count(lv.map, '5') < 10 || doors < 2)) fail(tag + ' kyrkogården saknar gravar/kapell/kryptor');
    if (biome === 'courtyard' && doors < 6) fail(tag + ' för få dörrar på borggården');
    if (biome === 'swamp') {
      // träsket: vägg 0 runt om, mycket vatten, döda träd, hyddor med dörr, golv mossa/spänger
      let walk = 0; for (const r of lv.map) for (const c of r) if (!isBlock(c)) walk++;
      const wet = count(lv.map, '-') / walk;
      B.swamp.wet = (B.swamp.wet || 0) + wet;
      if (wet < 0.2 || wet > 0.6) fail(tag + ` vattenandel ${wet.toFixed(2)}`);
      if (lv.map[0].replace(/0/g, '') !== '' || lv.map.some(r => r[0] !== '0' || r[r.length - 1] !== '0')) fail(tag + ' kanten är inte 0');
      if (count(lv.map, 't') < 5) fail(tag + ' för få döda träd');
      if (lv.floors[0] !== 'floor_swamp' || !lv.floors.includes('floor_wood_planks')) fail(tag + ' golv ' + lv.floors.join());
      if (!lv.floorMask.some(r => r.includes(String(lv.floors.indexOf('floor_wood_planks'))))) fail(tag + ' inga spänger');
      if (!(lv.fog[1] > lv.fog[0] && lv.fog[1] > lv.fog[2])) fail(tag + ' dimman är inte grön ' + lv.fog);
      B.swamp.huts = (B.swamp.huts || 0) + lv.rooms.filter(r => r.tag === 'hut').length;
    }
    if (biome === 'frost') {
      // frostfästet: väggar av frusen sten Ø (vaktarens salar i sitt tecken), snögårdar under himlen, golv frusen sten/snö,
      // kall blåvit dimma, istappar högst 8 och bara intill väggar
      const m = lv.map, gw = GUARD[lv.guardian].wall, walls = new Set();
      for (const r of m) for (const c of r) if (isWall(c)) walls.add(c);
      for (const c of walls) if (c !== 'Ø' && c !== gw) fail(tag + ' frostfästet har väggen ' + c);
      if (m[0].replace(/Ø/g, '') !== '' || m.some(r => r[0] !== 'Ø' || r[r.length - 1] !== 'Ø')) fail(tag + ' kanten är inte Ø');
      if (lv.floors[0] !== 'floor_frost_stone' || !lv.floors.includes('floor_snow') || lv.floor !== 'floor_frost_stone') fail(tag + ' golv ' + lv.floors.join());
      if (!(lv.fog[2] > lv.fog[1] && lv.fog[1] > lv.fog[0] && lv.fog[0] >= 15)) fail(tag + ' dimman är inte kall blåvit ' + lv.fog);
      if (lv.theme !== 'frost' || lv.secretWall !== 'Ø' || typeof lv.ceil !== 'string') fail(tag + ' tema/hemlig vägg/tak');
      const snow = lv.floors.indexOf('floor_snow'), yards = lv.rooms.map((r, i) => [r, i]).filter(([r]) => r.tag === 'yard');
      if (!yards.length) fail(tag + ' inga gårdar');
      for (const [r, i] of yards) {
        let n = 0, sky = 0, sn = 0;
        for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) if (lv.roomMask[y].charCodeAt(x) - 48 === i) { n++; if (lv.sky[y][x] === '1') sky++; if (+lv.floorMask[y][x] === snow) sn++; }
        if (sky < n || sn < n * 0.6) fail(tag + ` gård ${i}: himmel ${sky}/${n}, snö ${sn}/${n}`);
      }
      // inomhus (utom gårdarna) är taket på
      lv.rooms.forEach((r, i) => { if (r.tag !== 'yard') for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) if (lv.roomMask[y].charCodeAt(x) - 48 === i && lv.sky[y][x] === '1') { fail(tag + ` himmel i salen ${i} (${r.arch})`); return; } });
      if (count(m, 'Ç') !== lv.features.icicles || count(m, 'Ç') > 8) fail(tag + ' istappar ' + count(m, 'Ç'));
      if (opts.guardian === 'frost' && count(m, '¦') < 30) fail(tag + ' frostväktarens sal saknar isväggar ¦');
      const st = B.frost; st.yards = (st.yards || 0) + yards.length; st.ice = (st.ice || 0) + count(m, ':'); st.icic = (st.icic || 0) + count(m, 'Ç');
      for (const r of lv.rooms) if (r.arch === 'throne') st.throne = (st.throne || 0) + 1;
    }
    if (biome === 'volcano') {
      // vulkanen: väggar av obsidian Ò (vaktarens salar i sitt tecken), askfält under röd himmel, golv basalt/aska, röd dimma,
      // lava i rummen (aldrig enda vägen), lavamaskar vid lavan
      const m = lv.map, gw = GUARD[lv.guardian].wall, walls = new Set();
      for (const r of m) for (const c of r) if (isWall(c)) walls.add(c);
      for (const c of walls) if (c !== 'Ò' && c !== gw) fail(tag + ' vulkanen har väggen ' + c);
      if (m[0].replace(/Ò/g, '') !== '' || m.some(r => r[0] !== 'Ò' || r[r.length - 1] !== 'Ò')) fail(tag + ' kanten är inte Ò');
      if (lv.floors[0] !== 'floor_basalt' || !lv.floors.includes('floor_ash') || lv.floor !== 'floor_basalt' || lv.ceil !== 'floor_basalt') fail(tag + ' golv/tak ' + lv.floors.join() + ' ' + lv.ceil);
      if (!(lv.fog[0] > lv.fog[1] && lv.fog[1] >= lv.fog[2] && lv.fog[0] >= 28)) fail(tag + ' dimman är inte röd ' + lv.fog);
      if (lv.theme !== 'volcano' || lv.secretWall !== 'Ò') fail(tag + ' tema/hemlig vägg');
      if (!/^(ASKFÄSTET|DEN BRINNANDE SMEDJAN|MAGMAKAMRARNA|OBSIDIANHALLARNA|ASKFÄLTEN|ELDBERGETS HJÄRTA)$/.test(lv.name)) fail(tag + ' namn ' + lv.name);
      const ash = lv.floors.indexOf('floor_ash'), yards = lv.rooms.map((r, i) => [r, i]).filter(([r]) => r.tag === 'yard');
      if (!yards.length) fail(tag + ' inga askfält');
      for (const [r, i] of yards) {
        let n = 0, sky = 0, an = 0;
        for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) if (lv.roomMask[y].charCodeAt(x) - 48 === i) { n++; if (lv.sky[y][x] === '1') sky++; if (+lv.floorMask[y][x] === ash) an++; }
        if (sky < n || an < n * 0.6) fail(tag + ` askfält ${i}: himmel ${sky}/${n}, aska ${an}/${n}`);
      }
      lv.rooms.forEach((r, i) => { if (r.tag !== 'yard') for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) if (lv.roomMask[y].charCodeAt(x) - 48 === i && lv.sky[y][x] === '1') { fail(tag + ` himmel i salen ${i} (${r.arch})`); return; } });
      if (count(m, ':') || count(m, 'Ç') || count(m, '-')) fail(tag + ' is/istappar/vatten i vulkanen');
      if (opts.guardian === 'flame' && count(m, '¤') < 30) fail(tag + ' flamväktarens sal saknar väggar ¤');
      if (count(m, '_') < 8) fail(tag + ' för lite lava ' + count(m, '_'));
      const st = B.volcano;
      st.yards = (st.yards || 0) + yards.length; st.lavaN = (st.lavaN || 0) + count(m, '_'); st.lavaL = (st.lavaL || 0) + (count(m, '_') ? 1 : 0);
      st.worms = (st.worms || 0) + count(m, 'Þ'); st.wormL = (st.wormL || 0) + (count(m, 'Þ') ? 1 : 0);
      st.bridges = (st.bridges || 0) + lv.map.reduce((k, r, y) => k + [...r].filter((c, x) => c !== '_' && !isWall(c) && y > 0 && y < m.length - 1 && ((m[y - 1][x] === '_' && m[y + 1][x] === '_') || (r[x - 1] === '_' && r[x + 1] === '_'))).length, 0);
    }
    if (biome === 'tomb') checkTomb(lv, `[tomb seed=${seed} d=${depth}]`, opts);
    if (biome === 'crystal') checkCrystal(lv, tag);
    if (biome === 'sunken') checkSunken(lv, tag);
    if (biome === 'clock') checkClock(lv, tag);
    if (biome === 'sky') checkSky(lv, tag);
    if (biome === 'fungus') checkFungus(lv, tag);
    if (biome === 'mirror') checkMirror(lv, tag);
    if (!samples[biome]) samples[biome] = lv;
  }
}

// ---- NPC:er, husdjursbur, drycker och nya vapen: frekvenser över alla biomer ----
{
  let n = 0; const f = { alchemist: 0, priest: 0, petcage: 0, potions: 0, icicles: 0 }, fn = { potions: 0 };
  for (const id of BIOME_IDS) { const s = B[id]; n += s.n; for (const k in f) f[k] += s.feat[k] || 0; fn.potions += s.featN.potions || 0; }
  const pc = k => f[k] / n;
  if (pc('alchemist') < 0.18 || pc('alchemist') > 0.42) fail('alkemist på ' + (100 * pc('alchemist')).toFixed(0) + ' % av banorna (väntat ~30 %)');
  if (pc('priest') < 0.14 || pc('priest') > 0.36) fail('präst på ' + (100 * pc('priest')).toFixed(0) + ' % av banorna (väntat ~25 %)');
  if (pc('petcage') < 0.07 || pc('petcage') > 0.25) fail('husdjursbur på ' + (100 * pc('petcage')).toFixed(0) + ' % av banorna (väntat ~15 %)');
  if (fn.potions / n < 0.3 || fn.potions / n > 1.6) fail('drycker per bana ' + (fn.potions / n).toFixed(2));
  if ((B.frost.feat.icicles || 0) < B.frost.n * 0.8) fail('för få frostbanor med istappar ' + B.frost.feat.icicles);
  stats.npc = Object.keys(f).map(k => `${k} ${(100 * pc(k)).toFixed(0)} %`).join(', ') + `, drycker ${(fn.potions / n).toFixed(2)} per bana`;
  // de nya vapnen går att lägga ut i alla biomer (tecken och id)
  for (const id of BIOME_IDS) for (const w of ['å', 'ä', 'ö', 'axe', 'launcher', 'é', 'ü', 'ñ', 'nailgun', 'staff', 'bow']) {
    const lv = Gen.floor('wpn-' + id + w, 3, { biome: id, weapon: w });
    if (count(lv.map, wchOf(w)) !== 1) fail(`[${id}] vapnet ${w} lades inte ut`);
  }
}

// ---- version 6: frekvenser för de nya sakerna över alla biomer, och per biom där de hör hemma ----
{
  let n = 0; const f = {};
  const K6 = ['campfire', 'questboard', 'secretstairs', 'runes', 'meat', 'firejets', 'crumble', 'pendulums', 'plates', 'poisonbarrels', 'frostbarrels'];
  for (const id of BIOME_IDS) { const s = B[id]; n += s.n; for (const k of K6) f[k] = (f[k] || 0) + (s.feat[k] || 0); }
  const pc = k => f[k] / n, share = (id, k) => (B[id].feat[k] || 0) / B[id].n, avgN = (id, k) => (B[id].featN[k] || 0) / B[id].n;
  if (pc('campfire') < 0.15 || pc('campfire') > 0.35) fail('lägereld på ' + (100 * pc('campfire')).toFixed(0) + ' % av banorna (väntat ~25 %)');
  if (pc('questboard') < 0.2 || pc('questboard') > 0.4) fail('anslagstavla på ' + (100 * pc('questboard')).toFixed(0) + ' % av banorna (väntat ~30 %)');
  if (pc('secretstairs') < 0.08 || pc('secretstairs') > 0.24) fail('hemlig trappa på ' + (100 * pc('secretstairs')).toFixed(0) + ' % av banorna (väntat ~15 %)');
  if (pc('runes') < 0.25 || pc('runes') > 0.45) fail('runsten på ' + (100 * pc('runes')).toFixed(0) + ' % av banorna (väntat ~35 %)');
  if (share('volcano', 'firejets') < 0.8 || share('volcano', 'crumble') < 0.8 || share('volcano', 'lava') < 0.9) fail(`vulkanen: eldstrålar ${share('volcano', 'firejets')}, smulande golv ${share('volcano', 'crumble')}, lava ${share('volcano', 'lava')}`);
  if (B.volcano.wormL < B.volcano.n * 0.9) fail('för få vulkanbanor med lavamaskar ' + B.volcano.wormL);
  // vulkanen precis som spelet anropar den (seed RNG.hash(...), alltid vaktare, butik på position 2/4, vapen-id eller null)
  {
    let lo = 0, noWorm = 0, lava = 0; const N = 120;
    for (let i = 0; i < N; i++) {
      const pos = i % 5, cyc = i % 3, opts = { shop: pos === 2 || pos === 4, weapon: GAME_WEAPONS[i % GAME_WEAPONS.length], biome: 'volcano', guardian: GUARD_IDS[i % GUARD_IDS.length] };
      const lv = Gen.floor(RNG.hash('run' + i + ':' + pos), Math.min(5, pos + 1 + cyc), opts), m = lv.map;
      for (const e of Gen.validate(lv)) fail(`[volcano spel ${i}] ${e}`);
      const nl = count(m, '_'); lava += nl;
      if (nl < 8) lo++;
      if (!count(m, 'Þ')) noWorm++;
    }
    if (lo) fail(`vulkanen med spelets opts: ${lo} av ${N} banor har under 8 lavarutor`);
    if (noWorm > N * 0.05) fail(`vulkanen med spelets opts: ${noWorm} av ${N} banor saknar lavamaskar`);
    stats.volcGame = `lava ${(lava / N).toFixed(1)} rutor per bana, utan lavamask ${noWorm}/${N}`;
  }
  for (const id of BIOME_IDS) if (id !== 'volcano' && id !== 'swamp' && avgN(id, 'poisonbarrels') >= avgN('volcano', 'poisonbarrels')) fail(`gifttunnor: ${id} har fler än vulkanen`);
  for (const id of BIOME_IDS) if (id !== 'frost' && avgN(id, 'frostbarrels') >= avgN('frost', 'frostbarrels')) fail(`frosttunnor: ${id} har fler än frostfästet`);
  for (const id of ['caves', 'graveyard', 'forest', 'courtyard', 'swamp', 'frost']) if (B[id].feat.firejets) fail('eldstrålar i ' + id);
  stats.v6 = K6.map(k => `${k} ${(100 * pc(k)).toFixed(0)} %`).join(', ');
  let crumbleL = 0; for (const id of BIOME_IDS) crumbleL += B[id].crumbleOK || 0;
  stats.crumble = crumbleL;
}

// ---- version 7: gravkammaren precis som spelet anropar den, och frekvenser för de nya sakerna ----
{
  // seed RNG.hash(seed + ':' + djup), djup min(5, pos + varv), butik på position 2 och 4, vapen-id eller null, alla väktare
  const N = 150, ALL = Object.keys(GUARD), t = [];
  let qsL = 0, boulder = 0, beams = 0, scar = 0, mummy = 0, ph = 0;
  for (let i = 0; i < N; i++) {
    const pos = 1 + (i % 5), cyc = Math.floor(i / 5) % 3, depth = Math.min(5, pos + cyc), seed = RNG.hash('krypta' + i + ':' + (pos + 6 * cyc));
    const opts = { shop: pos === 2 || pos === 4, weapon: GAME_WEAPONS[i % GAME_WEAPONS.length], biome: 'tomb', guardian: ALL[i % ALL.length] };
    const [lv, ms] = timed(() => Gen.floor(seed, depth, opts));
    t.push(ms);
    const { tag } = checkLevel(lv, seed, depth, opts, 'tomb');
    checkTomb(lv, tag, opts);
    if (lv.guardian !== opts.guardian) fail(tag + ' opts.guardian ignoreras');
    if (i % 10 === 0 && JSON.stringify(Gen.floor(seed, depth, opts)) !== JSON.stringify(lv)) fail(tag + ' inte deterministisk');
    const m = lv.map;
    if (count(m, '¯')) qsL++; if (count(m, '¹')) boulder++; if (lv.beams.length) beams++; if (count(m, 'Õ')) scar++; if (count(m, 'Ã')) mummy++;
    if (opts.guardian === 'pharaoh') ph++;
  }
  if (qsL < N * 0.75) fail(`gravkammaren med spelets opts: kvicksand bara på ${qsL}/${N}`);
  if (boulder < N * 0.3 || boulder > N * 0.7) fail(`gravkammaren med spelets opts: rullsten på ${boulder}/${N} (väntat ~50 %)`);
  if (beams < N * 0.7) fail(`gravkammaren med spelets opts: ljusschakt bara på ${beams}/${N}`);
  if (scar < N * 0.55) fail(`gravkammaren med spelets opts: skarabéer bara på ${scar}/${N}`);
  if (mummy < N * 0.85) fail(`gravkammaren med spelets opts: mumier bara på ${mummy}/${N}`);
  stats.tombGame = `${N} banor, snitt ${(t.reduce((a, b) => a + b, 0) / N).toFixed(1)} ms (max ${Math.max(...t).toFixed(1)}), kvicksand ${qsL}, rullsten ${boulder}, ljusschakt ${beams}, skarabéer ${scar}, mumier ${mummy}, faraonen som väktare ${ph}`;
  // alla väktare (även faraonen) i alla biomer
  for (const id of BIOME_IDS) {
    const lv = Gen.floor('ph-' + id, 3, { biome: id, guardian: 'pharaoh', weapon: 'musket' });
    for (const e of Gen.validate(lv)) fail(`[${id} faraonen] ${e}`);
    if (lv.guardian !== 'pharaoh' || count(lv.map, 'Ù') < (id === 'sky' ? 4 : 30) || count(lv.map, 'ï') !== 1) fail(`[${id}] faraonen som väktare / musköten`); // molnborgen: glesa murar
  }
  // frekvenser över alla biomer (andel banor) och per biom
  let n = 0; const f = {}, nn = {};
  const K7 = ['sarcophagi', 'quicksand', 'boulders', 'bells', 'gambler', 'banker', 'wanderer', 'pages', 'batteries', 'stones', 'beams', 'scarabs', 'mummy', 'jackal', 'thief', 'doppel', 'glyphs'];
  let d2 = 0, d2bank = 0, d2bell = 0;
  for (const id of BIOME_IDS) { const s = B[id]; n += s.n; d2 += s.d2; d2bank += s.d2bank; d2bell += s.d2bell; for (const k of K7) { f[k] = (f[k] || 0) + (s.f7[k] || 0); nn[k] = (nn[k] || 0) + (s.n7[k] || 0); } }
  const pc = k => f[k] / n, share = (id, k) => (B[id].f7[k] || 0) / B[id].n, avgN = k => nn[k] / n;
  if (pc('gambler') < 0.12 || pc('gambler') > 0.3) fail('spelare på ' + (100 * pc('gambler')).toFixed(0) + ' % av banorna (väntat ~20 %)');
  if (d2bank / d2 < 0.08 || d2bank / d2 > 0.24) fail('bankir på ' + (100 * d2bank / d2).toFixed(0) + ' % av banorna på djup 2+ (väntat ~15 %)');
  if (pc('wanderer') < 0.15 || pc('wanderer') > 0.35) fail('vandrare på ' + (100 * pc('wanderer')).toFixed(0) + ' % av banorna (väntat ~25 %)');
  if (d2bell / d2 < 0.15 || d2bell / d2 > 0.35) fail('larmklocka på ' + (100 * d2bell / d2).toFixed(0) + ' % av banorna på djup 2+ (väntat ~25 %)');
  if (pc('pages') < 0.3 || pc('pages') > 0.5) fail('krönikesida på ' + (100 * pc('pages')).toFixed(0) + ' % av banorna (väntat ~40 %)');
  if (avgN('batteries') < 0.4 || avgN('batteries') > 1.4) fail('lampolja per bana ' + avgN('batteries').toFixed(2));
  if (avgN('stones') < 0.4 || avgN('stones') > 1.2) fail('kaststenshögar per bana ' + avgN('stones').toFixed(2));
  if (share('tomb', 'sarcophagi') < 1 || share('tomb', 'glyphs') < 0.95) fail(`gravkammaren: sarkofager ${share('tomb', 'sarcophagi')}, hieroglyfer ${share('tomb', 'glyphs')}`);
  for (const id of BIOME_IDS) if (id !== 'tomb' && (B[id].f7.quicksand || B[id].f7.glyphs)) fail('kvicksand/hieroglyfer i ' + id);
  for (const id of BIOME_IDS) if (!['tomb', 'dungeon'].includes(id) && B[id].f7.boulders) fail('rullsten i ' + id);
  if (share('dungeon', 'boulders') < 0.08 || share('dungeon', 'boulders') > 0.3) fail('rullsten i fängelsehålan på ' + (100 * share('dungeon', 'boulders')).toFixed(0) + ' % (väntat ~20 %)');
  if (share('graveyard', 'mummy') < 0.15 || share('courtyard', 'jackal') < 0.2 || share('caves', 'scarabs') < 0.2) fail(`mumier på kyrkogården ${share('graveyard', 'mummy')}, schakaler på borggården ${share('courtyard', 'jackal')}, skarabéer i grottorna ${share('caves', 'scarabs')}`);
  stats.v7 = K7.map(k => `${k} ${(100 * pc(k)).toFixed(0)} %`).join(', ') + `; bankir ${(100 * d2bank / d2).toFixed(0)} % och larmklocka ${(100 * d2bell / d2).toFixed(0)} % av banorna på djup 2+`;
  let qsOK = 0; for (const id of BIOME_IDS) qsOK += B[id].qsOK || 0;
  stats.qsOK = qsOK;
  if (Gen.floor.stats.v7off > (Gen.floor.stats.retries - stats.retries0)) fail('för många ombyggen utan version 7: ' + Gen.floor.stats.v7off);
}

// ---- version 8: kristallgrottorna och sjunkna staden precis som spelet anropar dem, väktarna och vapnen, frekvenser ----
{
  // seed RNG.hash(seed + ':' + djup), djup min(5, pos + varv), butik på position 2 och 4, vapen-id eller null, alla väktare
  const N = 150, ALL = Object.keys(GUARD);
  stats.v8Game = [];
  for (const biome of ['crystal', 'sunken']) {
    const t = []; let cq = 0;
    for (let i = 0; i < N; i++) {
      const pos = 1 + (i % 5), cyc = Math.floor(i / 5) % 3, depth = Math.min(5, pos + cyc), seed = RNG.hash('krypta8-' + biome + i + ':' + (pos + 6 * cyc));
      const opts = { shop: pos === 2 || pos === 4, weapon: GAME_WEAPONS[i % GAME_WEAPONS.length], biome, guardian: ALL[i % ALL.length] };
      const [lv, ms] = timed(() => Gen.floor(seed, depth, opts));
      t.push(ms);
      const { tag } = checkLevel(lv, seed, depth, opts, biome);
      if (biome === 'crystal') checkCrystal(lv, tag); else checkSunken(lv, tag);
      if (lv.guardian !== opts.guardian) fail(tag + ' opts.guardian ignoreras');
      if (i % 10 === 0 && JSON.stringify(Gen.floor(seed, depth, opts)) !== JSON.stringify(lv)) fail(tag + ' inte deterministisk');
      if (opts.guardian === (biome === 'crystal' ? 'crystalqueen' : 'leviathan')) cq++;
    }
    stats.v8Game.push(`${biome}: ${N} banor, snitt ${(t.reduce((a, b) => a + b, 0) / N).toFixed(1)} ms (max ${Math.max(...t).toFixed(1)}), egen väktare ${cq}`);
  }
  // utan opts.guardian: kristalldrottningen/leviatan ungefär varannan gång i sin biom
  for (const [biome, gid] of [['crystal', 'crystalqueen'], ['sunken', 'leviathan']]) {
    let k = 0; for (let i = 0; i < 40; i++) if (Gen.floor('own-' + biome + i, 1 + (i % 5), { biome }).guardian === gid) k++;
    if (k < 10 || k > 30) fail(`${biome}: egen väktare ${k} av 40 utan opts.guardian (väntat ~20)`);
  }
  // de nya väktarna och vapnen i alla biomer
  for (const id of BIOME_IDS) {
    for (const [gid, w] of [['crystalqueen', 'harpoon'], ['leviathan', 'Â']]) {
      const opts = { biome: id, guardian: gid, weapon: w }, seed = gid + '-' + id, lv = Gen.floor(seed, 3, opts);
      const { tag } = checkLevel(lv, seed, 3, opts, id);
      if (lv.guardian !== gid || count(lv.map, GUARD[gid].wall) < (id === 'sky' ? 4 : 20)) fail(`${tag} väktaren ${gid} saknar sina väggar`); // molnborgen: glesa murar
    }
    for (const w of ['Á', 'boomerang', 'prism', 'À']) { const lv = Gen.floor('wpn8-' + id + w, 2, { biome: id, weapon: w }); if (count(lv.map, wchOf(w)) !== 1) fail(`[${id}] vapnet ${w} lades inte ut`); }
  }
  // frekvenser: nya saker i alla biomer (andel banor) och biomernas egna
  let n = 0, d2 = 0, d3 = 0, st2 = 0, wi3 = 0; const f = {};
  for (const id of BIOME_IDS) { const s = B[id]; n += s.n; d2 += s.d2s || 0; d3 += s.d3 || 0; st2 += s.d2stalker || 0; wi3 += s.d3witch || 0; for (const k in s.f8) f[k] = (f[k] || 0) + s.f8[k]; }
  const pc = k => (f[k] || 0) / n, share = (id, k) => (B[id].f8[k] || 0) / B[id].n;
  if (pc('cartographer') < 0.09 || pc('cartographer') > 0.23) fail('kartografen på ' + (100 * pc('cartographer')).toFixed(0) + ' % av banorna (väntat ~15 %)');
  if (pc('talentaltar') < 0.17 || pc('talentaltar') > 0.34) fail('talangaltare på ' + (100 * pc('talentaltar')).toFixed(0) + ' % av banorna (väntat ~25 %)');
  if (pc('books') < 0.26 || pc('books') > 0.45) fail('kunskapsbok på ' + (100 * pc('books')).toFixed(0) + ' % av banorna (väntat ~35 %)');
  if (st2 / d2 < 0.12 || st2 / d2 > 0.3) fail('skuggjägare på ' + (100 * st2 / d2).toFixed(0) + ' % av banorna på djup 2+ (väntat ~20 %)');
  if (wi3 / d3 < 0.1 || wi3 / d3 > 0.3) fail('häxa på ' + (100 * wi3 / d3).toFixed(0) + ' % av banorna på djup 3+ (väntat ~20 %)');
  if (share('crystal', 'glowcrystals') < 1 || share('crystal', 'crystalspikes') < 0.85 || share('crystal', 'breakcrystals') < 0.6) fail(`kristallgrottorna: glödkristaller ${share('crystal', 'glowcrystals')}, spikar ${share('crystal', 'crystalspikes')}, brytande kristaller ${share('crystal', 'breakcrystals')}`);
  if (share('sunken', 'deepwater') < 1 || share('sunken', 'tide') < 0.9 || share('sunken', 'eels') < 0.6 || share('sunken', 'wrecks') < 0.85 || share('sunken', 'bubbles') < 0.5)
    fail(`sjunkna staden: vatten ${share('sunken', 'deepwater')}, tidvatten ${share('sunken', 'tide')}, ålar ${share('sunken', 'eels')}, vrakkistor ${share('sunken', 'wrecks')}, luftbubblor ${share('sunken', 'bubbles')}`);
  for (const id of BIOME_IDS) if (id !== 'crystal' && (B[id].f8.crystalspikes || B[id].f8.breakcrystals)) fail('kristallspikar/brytande kristaller i ' + id);
  for (const id of BIOME_IDS) if (id !== 'sunken' && (B[id].f8.tide || B[id].f8.eels || B[id].f8.wrecks || B[id].f8.bubbles)) fail('tidvatten/ålar/vrakkistor/luftbubblor i ' + id);
  stats.v8 = ['cartographer', 'talentaltar', 'books'].map(k => `${k} ${(100 * pc(k)).toFixed(0)} %`).join(', ') + `; skuggjägare ${(100 * st2 / d2).toFixed(0)} % (djup 2+), häxa ${(100 * wi3 / d3).toFixed(0)} % (djup 3+)`;
  let wetOK = 0; for (const id of BIOME_IDS) wetOK += B[id].wetOK || 0;
  stats.wetOK = wetOK;
}

// ---- version 9: klocktornet och molnborgen precis som spelet anropar dem, väktarna och vapnen, frekvenser ----
{
  // seed RNG.hash(seed + ':' + djup), djup min(5, pos + varv), butik på position 2 och 4, vapen-id eller null, alla väktare
  const N = 150, ALL = Object.keys(GUARD);
  stats.v9Game = [];
  for (const biome of ['clock', 'sky']) {
    const t = []; let own = 0, wpn = 0;
    for (let i = 0; i < N; i++) {
      const pos = 1 + (i % 5), cyc = Math.floor(i / 5) % 3, depth = Math.min(5, pos + cyc), seed = RNG.hash('krypta9-' + biome + i + ':' + (pos + 6 * cyc));
      const opts = { shop: pos === 2 || pos === 4, weapon: GAME_WEAPONS[i % GAME_WEAPONS.length], biome, guardian: ALL[i % ALL.length] };
      const [lv, ms] = timed(() => Gen.floor(seed, depth, opts));
      t.push(ms);
      const { tag } = checkLevel(lv, seed, depth, opts, biome);
      if (biome === 'clock') checkClock(lv, tag); else checkSky(lv, tag);
      if (lv.guardian !== opts.guardian) fail(tag + ' opts.guardian ignoreras');
      if (i % 10 === 0 && JSON.stringify(Gen.floor(seed, depth, opts)) !== JSON.stringify(lv)) fail(tag + ' inte deterministisk');
      if (opts.guardian === (biome === 'clock' ? 'clockmaker' : 'thunderbird')) own++;
      if (['sawlauncher', 'windgun', 'spear'].includes(opts.weapon)) wpn++;
    }
    t.sort((a, b) => a - b);
    stats.v9Game.push(`${biome}: ${N} banor, snitt ${(t.reduce((a, b) => a + b, 0) / N).toFixed(1)} ms (median ${t[N >> 1].toFixed(1)}, max ${t[N - 1].toFixed(1)}), egen väktare ${own}, nya vapen ${wpn}`);
  }
  // utan opts.guardian: urmakaren/stormfågeln ungefär varannan gång i sin biom
  for (const [biome, gid] of [['clock', 'clockmaker'], ['sky', 'thunderbird']]) {
    let k = 0; for (let i = 0; i < 40; i++) if (Gen.floor('own9-' + biome + i, 1 + (i % 5), { biome }).guardian === gid) k++;
    if (k < 10 || k > 30) fail(`${biome}: egen väktare ${k} av 40 utan opts.guardian (väntat ~20)`);
  }
  // de nya väktarna och vapnen i alla biomer
  for (const id of BIOME_IDS) {
    for (const [gid, w] of [['clockmaker', 'sawlauncher'], ['thunderbird', 'Ĳ']]) {
      const opts = { biome: id, guardian: gid, weapon: w }, seed = gid + '-' + id, lv = Gen.floor(seed, 3, opts);
      const { tag } = checkLevel(lv, seed, 3, opts, id);
      if (lv.guardian !== gid || count(lv.map, GUARD[gid].wall) < (id === 'sky' ? 4 : 20)) fail(`${tag} väktaren ${gid} saknar sina väggar`);
      if (!count(lv.map, gid === 'clockmaker' ? 'Ņ' : 'ņ')) fail(`${tag} väktaren ${gid} saknar sin dekor`);
    }
    for (const w of ['į', 'windgun', 'spear', 'Į']) { const lv = Gen.floor('wpn9-' + id + w, 2, { biome: id, weapon: w }); if (count(lv.map, wchOf(w)) !== 1) fail(`[${id}] vapnet ${w} lades inte ut`); }
  }
  // frekvenser: kugghjul och fjädrar i alla biomer (andel banor), biomernas egna
  let n = 0, nOld = 0, gOld = 0, fOld = 0, d3 = 0, gi3 = 0; const f = {};
  for (const id of BIOME_IDS) {
    const s = B[id]; n += s.n; for (const k in s.f9) f[k] = (f[k] || 0) + s.f9[k];
    if (id !== 'clock' && id !== 'sky') { nOld += s.n; gOld += s.f9.gears || 0; fOld += s.f9.feathers || 0; }
  }
  d3 = B.sky.d3v9 || 0; gi3 = B.sky.d3giant || 0;
  const share = (id, k) => (B[id].f9[k] || 0) / B[id].n;
  if (gOld / nOld < 0.2 || gOld / nOld > 0.4) fail('kugghjul på ' + (100 * gOld / nOld).toFixed(0) + ' % av banorna i de gamla biomerna (väntat ~30 %)');
  if (fOld / nOld < 0.08 || fOld / nOld > 0.23) fail('fjädrar på ' + (100 * fOld / nOld).toFixed(0) + ' % av banorna i de gamla biomerna (väntat ~15 %)');
  if (share('clock', 'gears') < 0.35 || share('clock', 'gears') > 0.65) fail('kugghjul i klocktornet ' + share('clock', 'gears'));
  if (share('clock', 'sawTracks') < 0.9 || share('clock', 'timebubbles') < 0.8 || share('clock', 'clockworks') < 0.97 || share('clock', 'gearspiders') < 0.6 || share('clock', 'chimes') < 0.45 || share('clock', 'chimes') > 0.75)
    fail(`klocktornet: sågspår ${share('clock', 'sawTracks')}, tidsbubblor ${share('clock', 'timebubbles')}, urverk ${share('clock', 'clockworks')}, kuggspindlar ${share('clock', 'gearspiders')}, klockspel ${share('clock', 'chimes')}`);
  if (share('sky', 'void') < 1 || share('sky', 'winds') < 0.85 || share('sky', 'lightningrods') < 1 || share('sky', 'cloudchests') < 0.85) fail(`molnborgen: tomrum ${share('sky', 'void')}, vind ${share('sky', 'winds')}, blixtstänger ${share('sky', 'lightningrods')}, molnkistor ${share('sky', 'cloudchests')}`);
  if (d3 && (gi3 / d3 < 0.3 || gi3 / d3 > 0.8)) fail('molnjättar på ' + (100 * gi3 / d3).toFixed(0) + ' % av molnborgens banor på djup 3+ (väntat ~55 %)');
  for (const id of BIOME_IDS) if (id !== 'clock' && ['saws', 'timebubbles', 'chimes', 'gearspiders'].some(k => B[id].f9[k])) fail('klocktornets saker i ' + id);
  for (const id of BIOME_IDS) if (id !== 'sky' && ['void', 'winds', 'cloudchests', 'cloudgiants'].some(k => B[id].f9[k])) fail('molnborgens saker i ' + id);
  stats.v9 = `kugghjul ${(100 * gOld / nOld).toFixed(0)} %, fjädrar ${(100 * fOld / nOld).toFixed(0)} % av banorna i de gamla biomerna; klocktornet kugghjul ${(100 * share('clock', 'gears')).toFixed(0)} %, ` +
    `molnborgen fjädrar ${(100 * share('sky', 'feathers')).toFixed(0)} %, molnjättar ${(100 * gi3 / Math.max(1, d3)).toFixed(0)} % (djup 3+)`;
  let sawOK = 0, voidOK = 0; for (const id of BIOME_IDS) { sawOK += B[id].sawOK || 0; voidOK += B[id].voidOK || 0; }
  stats.sawOK = sawOK; stats.voidOK = voidOK;
}

// ---- frö-stabilitet (version 9): samma seeds med en gammal biom ger samma bana som version 8 (kugghjul och fjädrar ovanpå) ----
{
  if (!OldGen8) fail('frö-stabilitet: kunde inte läsa gen.js från version 8 (' + oldGen8Err + '); sätt GEN_OLD8=sökväg till den gamla filen');
  else {
    const OB = OldGen8.BIOMES.map(b => b.id), OG = Object.keys(OldGen8.GUARDIANS), OW = [null].concat(Object.values(OldGen8.WEAPONS));
    const KEYS = ['name', 'biome', 'guardian', 'theme', 'floor', 'floors', 'floorMask', 'roomMask', 'sky', 'rooms', 'fog', 'ambient', 'ceil', 'secretWall', 'boulders', 'beams', 'tide', 'depth'];
    let onTop = 0, levelsOnTop = 0, newB = 0;
    const cmp = (a, b, tag) => {
      for (const k of KEYS) if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) { fail(tag + ' frö-stabilitet: fältet ' + k + ' skiljer sig från version 8'); return; }
      if (b.saws.length || b.winds.length) { fail(tag + ' frö-stabilitet: sågspår/vind i en gammal biom'); return; }
      let k = 0;
      for (let y = 0; y < a.map.length; y++) for (let x = 0; x < a.map[0].length; x++) {
        const o = a.map[y][x], c = b.map[y][x];
        if (o === c) continue;
        if (o === '.' && 'Ŋŋ'.includes(c)) { k++; continue; }
        if ((o === '.' && c === 'Œ') || ('SKVILNORWUXY!@^ÅÄÉÜ'.includes(o) && V10EN.includes(c))) continue; // version 10 ovanpå
        if (o === '.' && c === 'Ũ') continue; // version 11 ovanpå
        fail(`${tag} frö-stabilitet: "${o}" blev "${c}" vid ${x},${y}`); return;
      }
      for (const key in a.features) if (a.features[key] !== b.features[key]) { fail(tag + ' frö-stabilitet: features.' + key); return; }
      onTop += k; if (k) levelsOnTop++;
    };
    for (let i = 0; i < 300; i++) {
      const biome = OB[i % OB.length], depth = 1 + (i % 5), seed = i % 2 ? 'stabil9-' + i : 5151 + i * 7919;
      const opts = { biome, shop: i % 3 === 0, weapon: OW[i % OW.length], guardian: i % 4 === 3 ? undefined : OG[i % OG.length] };
      cmp(OldGen8.floor(seed, depth, opts), Gen.floor(seed, depth, opts), `[stabil9 ${biome} seed=${seed} d=${depth}]`);
    }
    for (let i = 0; i < 300; i++) { // utan opts.biome: bara banor som slår klocktornet eller molnborgen ändras
      const depth = 1 + (i % 5), seed = 'stabilmix9-' + i, lv = Gen.floor(seed, depth, { shop: i % 2 === 0 });
      if (['clock', 'sky', 'fungus', 'mirror'].includes(lv.biome)) { newB++; continue; }
      cmp(OldGen8.floor(seed, depth, { shop: i % 2 === 0 }), lv, `[stabil9 mix seed=${seed} d=${depth}]`);
    }
    if (newB < 30 || newB > 110) fail('frö-stabilitet (version 9): ' + newB + ' av 300 banor utan opts.biome slog de nya biomerna (väntat ~67)');
    stats.stable9 = `300 banor med gammal biom + ${300 - newB} utan opts.biome identiska med version 8 utom ${onTop} nya rutor (Ŋ ŋ) på ${levelsOnTop} banor; ${newB} av 300 utan opts.biome blev clock/sky/fungus/mirror`;
  }
}

// ---- version 10: de gamla biomerna med spelets opts (100 banor per biom) och frekvenser per biom ----
{
  // seed RNG.hash(seed + ':' + djup), djup min(5, pos + varv), butik på position 2 och 4, vapen-id eller null, alla väktare
  const N = 100, ALL = Object.keys(GUARD);
  stats.v10Game = [];
  for (const biome of OLD6) {
    const t = [];
    for (let i = 0; i < N; i++) {
      const pos = 1 + (i % 5), cyc = Math.floor(i / 5) % 3, depth = Math.min(5, pos + cyc), seed = RNG.hash('krypta10-' + biome + i + ':' + (pos + 6 * cyc));
      const opts = { shop: pos === 2 || pos === 4, weapon: GAME_WEAPONS[i % GAME_WEAPONS.length], biome, guardian: ALL[i % ALL.length] };
      const [lv, ms] = timed(() => Gen.floor(seed, depth, opts));
      t.push(ms);
      const { tag } = checkLevel(lv, seed, depth, opts, biome);
      if (i % 10 === 0 && JSON.stringify(Gen.floor(seed, depth, opts)) !== JSON.stringify(lv)) fail(tag + ' inte deterministisk');
    }
    t.sort((a, b) => a - b);
    stats.v10Game.push(`${biome} snitt ${(t.reduce((a, b) => a + b, 0) / N).toFixed(1)} ms (median ${t[N >> 1].toFixed(1)})`);
  }
  const share = (id, c) => (B[id].f10 && B[id].e10[c] ? B[id].f10[c] / B[id].e10[c] : 0), per = (id, c) => (B[id].f10[c] ? B[id].n10[c] / B[id].f10[c] : 0);
  let nearL = 0, nearN = 0;
  for (const c of V10EN) {
    const h = V10_HOME[c], nb = V10_NEAR[c];
    if (share(h, c) < 0.35 || share(h, c) > 0.72) fail(`${c} på ${(100 * share(h, c)).toFixed(0)} % av banorna i ${h} (väntat ~50 %)`);
    if (per(h, c) < (c === 'ŏ' ? 2 : 1.2)) fail(`${c}: ${per(h, c).toFixed(2)} per bana i ${h} (väntat några)`);
    if (share(nb, c) > 0.2) fail(`${c} på ${(100 * share(nb, c)).toFixed(0)} % av banorna i ${nb} (väntat sällsynt, ~8 %)`);
    nearL += B[nb].f10[c] || 0; nearN += B[nb].e10[c] || 0;
    for (const id of BIOME_IDS) if (id !== h && id !== nb && B[id].f10 && B[id].f10[c]) fail(`${c} i ${id}`);
  }
  if (nearL / nearN < 0.02 || nearL / nearN > 0.16) fail(`de nya fienderna i närliggande biomer på ${(100 * nearL / nearN).toFixed(0)} % av banorna (väntat ~8 %)`);
  let aL = 0, aN = 0; for (const id of BIOME_IDS) { aL += B[id].f10['Œ'] || 0; aN += B[id].e10['Œ'] || 0; }
  if (aL / aN < 0.07 || aL / aN > 0.18) fail(`legendaltaret på ${(100 * aL / aN).toFixed(0)} % av banorna på djup 2+ (väntat ~12 %)`);
  const xb = B.courtyard.xbowCover / Math.max(1, B.courtyard.xbowN), td = B.swamp.toadWet / Math.max(1, B.swamp.toadN);
  if (xb < 0.5) fail(`armborstskyttar vid skydd: ${(100 * xb).toFixed(0)} % på borggården`);
  if (td < 0.8) fail(`paddjättar nära vatten: ${(100 * td).toFixed(0)} % i träsket`);
  const ar = {}; for (const id of BIOME_IDS) for (const k in B[id].altarRoom || {}) ar[k] = (ar[k] || 0) + B[id].altarRoom[k];
  stats.v10 = OLD6.map(id => `${id}: ` + [...V10EN].filter(c => B[id].e10[c] && (V10_HOME[c] === id || V10_NEAR[c] === id))
    .map(c => `${c} ${(100 * share(id, c)).toFixed(0)} %${V10_HOME[c] === id ? ` (${per(id, c).toFixed(1)}/bana)` : ''}`).join(', ')).join('; ') +
    `\n  legendaltaret ${(100 * aL / aN).toFixed(0)} % av banorna på djup 2+ (${aL}/${aN}; rum: ${Object.entries(ar).map(([k, v]) => k + '=' + v).join(' ')}), per biom: ` +
    BIOME_IDS.map(id => id + ' ' + (100 * share(id, 'Œ')).toFixed(0)).join(' ') +
    `\n  armborstskyttar vid skydd ${(100 * xb).toFixed(0)} %, paddjättar nära vatten ${(100 * td).toFixed(0)} %`;
}

// ---- frö-stabilitet (version 10): samma seeds ger samma bana som version 9 (nya fiender inbytta, legendaltaret ovanpå) ----
{
  if (!OldGen9) fail('frö-stabilitet: kunde inte läsa gen.js från version 9 (' + oldGen9Err + '); sätt GEN_OLD9=sökväg till den gamla filen');
  else {
    const OB = OldGen9.BIOMES.map(b => b.id), OG = Object.keys(OldGen9.GUARDIANS), OW = [null].concat(Object.values(OldGen9.WEAPONS));
    const KEYS = ['name', 'biome', 'guardian', 'theme', 'floor', 'floors', 'floorMask', 'roomMask', 'sky', 'rooms', 'fog', 'ambient', 'ceil', 'secretWall', 'boulders', 'beams', 'tide', 'saws', 'winds', 'depth', 'seed'];
    const FROM = 'SKVILNORWUXY!@^ÅÄÉÜ'; // fiender som content10 får byta ut
    let swaps = 0, altars = 0, levels = 0;
    const cmp = (a, b, tag) => {
      for (const k of KEYS) if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) { fail(tag + ' frö-stabilitet: fältet ' + k + ' skiljer sig från version 9'); return; }
      let k = 0;
      for (let y = 0; y < a.map.length; y++) for (let x = 0; x < a.map[0].length; x++) {
        const o = a.map[y][x], c = b.map[y][x];
        if (o === c) continue;
        if (o === '.' && c === 'Œ') { altars++; k++; continue; }
        if (o === '.' && c === 'Ũ') continue; // version 11 ovanpå
        if (FROM.includes(o) && V10EN.includes(c)) { swaps++; k++; continue; }
        fail(`${tag} frö-stabilitet: "${o}" blev "${c}" vid ${x},${y}`); return;
      }
      for (const key in a.features) if (a.features[key] !== b.features[key]) { fail(tag + ' frö-stabilitet: features.' + key); return; }
      if (k) levels++;
    };
    for (let i = 0; i < 390; i++) { // alla tretton biomer (30 var)
      const biome = OB[i % OB.length], depth = 1 + (i % 5), seed = i % 2 ? 'stabil10-' + i : 6161 + i * 7919;
      const opts = { biome, shop: i % 3 === 0, weapon: OW[i % OW.length], guardian: i % 4 === 3 ? undefined : OG[i % OG.length] };
      cmp(OldGen9.floor(seed, depth, opts), Gen.floor(seed, depth, opts), `[stabil10 ${biome} seed=${seed} d=${depth}]`);
    }
    for (let i = 0; i < 300; i++) { // utan opts.biome: inga nya biomer i version 10, alla banor jämförs (utom de som slår version 11-biomerna)
      const depth = 1 + (i % 5), seed = 'stabilmix10-' + i, lv = Gen.floor(seed, depth, { shop: i % 2 === 0 });
      if (lv.biome === 'fungus' || lv.biome === 'mirror') continue;
      cmp(OldGen9.floor(seed, depth, { shop: i % 2 === 0 }), lv, `[stabil10 mix seed=${seed} d=${depth}]`);
    }
    // arenor, hemliga våningar och labyrinter är oförändrade (utom de nya nycklarna i features och level.teleports från version 11)
    const strip = o => { const c = Object.assign({}, o); delete c.features; delete c.teleports; return JSON.stringify(c); };
    const same = (a, b) => strip(a) === strip(b);
    for (const arena of OldGen9.ARENAS) if (!same(OldGen9.boss('st10-' + arena, { arena }), Gen.boss('st10-' + arena, { arena }))) fail('frö-stabilitet: arenan ' + arena + ' ändrades');
    for (const id of OB) {
      if (!same(OldGen9.secret('st10s-' + id, { biome: id, depth: 2 }), Gen.secret('st10s-' + id, { biome: id, depth: 2 }))) fail('frö-stabilitet: hemliga våningen ' + id + ' ändrades');
      if (!same(OldGen9.maze('st10m-' + id, { biome: id, depth: 3 }), Gen.maze('st10m-' + id, { biome: id, depth: 3 }))) fail('frö-stabilitet: labyrinten ' + id + ' ändrades');
    }
    if (!swaps || !altars) fail(`frö-stabilitet (version 10): inga nya fiender (${swaps}) eller legendaltare (${altars}) i jämförelsen`);
    stats.stable10 = `390 banor i alla biomer + 300 utan opts.biome identiska med version 9 (${GEN_V9_REF.slice(0, 7)}) utom ${swaps} inbytta fiender och ${altars} legendaltare på ${levels} banor; arenor, hemliga våningar och labyrinter oförändrade`;
  }
}

// ---- version 11: svampriket och spegelpalatset precis som spelet anropar dem, väktarna och vapnen, frekvenser ----
{
  // seed RNG.hash(seed + ':' + djup), djup min(5, pos + varv), butik på position 2 och 4, vapen-id eller null, alla väktare
  const N = 150, ALL = Object.keys(GUARD);
  stats.v11Game = [];
  for (const biome of ['fungus', 'mirror']) {
    const t = []; let own = 0, wpn = 0;
    for (let i = 0; i < N; i++) {
      const pos = 1 + (i % 5), cyc = Math.floor(i / 5) % 3, depth = Math.min(5, pos + cyc), seed = RNG.hash('krypta11-' + biome + i + ':' + (pos + 6 * cyc));
      const opts = { shop: pos === 2 || pos === 4, weapon: GAME_WEAPONS[i % GAME_WEAPONS.length], biome, guardian: ALL[i % ALL.length] };
      const [lv, ms] = timed(() => Gen.floor(seed, depth, opts));
      t.push(ms);
      const { tag } = checkLevel(lv, seed, depth, opts, biome);
      if (biome === 'fungus') checkFungus(lv, tag); else checkMirror(lv, tag);
      if (lv.guardian !== opts.guardian) fail(tag + ' opts.guardian ignoreras');
      if (i % 10 === 0 && JSON.stringify(Gen.floor(seed, depth, opts)) !== JSON.stringify(lv)) fail(tag + ' inte deterministisk');
      if (opts.guardian === (biome === 'fungus' ? 'mycelmother' : 'mirrorking')) own++;
      if (['sporelauncher', 'mirrorshield', 'whip'].includes(opts.weapon)) { wpn++; if (count(lv.map, wchOf(opts.weapon)) !== 1) fail(tag + ' vapnet lades inte ut'); }
    }
    t.sort((a, b) => a - b);
    stats.v11Game.push(`${biome}: ${N} banor, snitt ${(t.reduce((a, b) => a + b, 0) / N).toFixed(1)} ms (median ${t[N >> 1].toFixed(1)}, max ${t[N - 1].toFixed(1)}), egen väktare ${own}, nya vapen ${wpn}`);
  }
  // utan opts.guardian: mycelmodern/spegelkungen ungefär varannan gång i sin biom
  for (const [biome, gid] of [['fungus', 'mycelmother'], ['mirror', 'mirrorking']]) {
    let k = 0; for (let i = 0; i < 40; i++) if (Gen.floor('own11-' + biome + i, 1 + (i % 5), { biome }).guardian === gid) k++;
    if (k < 10 || k > 30) fail(`${biome}: egen väktare ${k} av 40 utan opts.guardian (väntat ~20)`);
  }
  // de nya väktarna och vapnen i alla biomer
  for (const id of BIOME_IDS) {
    for (const [gid, w] of [['mycelmother', 'sporelauncher'], ['mirrorking', 'ŕ']]) {
      const opts = { biome: id, guardian: gid, weapon: w }, seed = gid + '-' + id, lv = Gen.floor(seed, 3, opts);
      const { tag } = checkLevel(lv, seed, 3, opts, id);
      if (lv.guardian !== gid || count(lv.map, GUARD[gid].wall) < (id === 'sky' ? 4 : 20)) fail(`${tag} väktaren ${gid} saknar sina väggar`);
      if (!count(lv.map, gid === 'mycelmother' ? 'Ŧ' : 'ŧ')) fail(`${tag} väktaren ${gid} saknar sitt ljus/sin dekor`);
      const bf = lv.floors.indexOf(GUARD[gid].floor), Z = findCh(lv.map, 'Z');
      if (bf < 0 || +lv.floorMask[Z[1]][Z[0]] !== bf) fail(`${tag} väktaren ${gid} saknar sitt golv`);
    }
    for (const w of ['Ŕ', 'whip', 'mirrorshield', 'Ŗ']) { const lv = Gen.floor('wpn11-' + id + w, 2, { biome: id, weapon: w }); if (count(lv.map, wchOf(w)) !== 1) fail(`[${id}] vapnet ${w} lades inte ut`); }
  }
  // frekvenser: sporsäckar i alla biomer, biomernas egna
  let nOld = 0, sOld = 0;
  for (const id of BIOME_IDS) if (id !== 'fungus' && id !== 'mirror') { nOld += B[id].n; sOld += B[id].f11.sporesacks || 0; }
  const share = (id, k) => (B[id].f11[k] || 0) / B[id].n, per = (id, k) => (B[id].n11[k] || 0) / B[id].n;
  if (sOld / nOld < 0.17 || sOld / nOld > 0.34) fail('sporsäckar på ' + (100 * sOld / nOld).toFixed(0) + ' % av banorna i de gamla biomerna (väntat ~25 %)');
  if (share('fungus', 'sporesacks') < 0.3 || share('fungus', 'sporesacks') > 0.62) fail('sporsäckar i svampriket ' + share('fungus', 'sporesacks'));
  if (share('fungus', 'bouncepads') < 1 || per('fungus', 'bouncepads') < 1.8 || per('fungus', 'bouncepads') > 3.2) fail(`svampriket: studsplattor på ${share('fungus', 'bouncepads')} (${per('fungus', 'bouncepads').toFixed(2)} per bana, väntat 1-4)`);
  if (share('fungus', 'sporepools') < 0.9 || share('fungus', 'glowshrooms') < 1 || share('fungus', 'capwalls') < 1 || share('fungus', 'sporelings') < 0.7)
    fail(`svampriket: sporpölar ${share('fungus', 'sporepools')}, glödsvampar ${share('fungus', 'glowshrooms')}, svamphattar ${share('fungus', 'capwalls')}, sporlingar ${share('fungus', 'sporelings')}`);
  if (share('mirror', 'teleporters') < 1 || per('mirror', 'teleporters') < 3 || share('mirror', 'mirrorwalls') < 1 || share('mirror', 'mirrorstatues') < 1 || share('mirror', 'shardlings') < 0.55)
    fail(`spegelpalatset: teleportrar ${share('mirror', 'teleporters')} (${per('mirror', 'teleporters').toFixed(1)} per bana), spegelväggar ${share('mirror', 'mirrorwalls')}, spegelstatyer ${share('mirror', 'mirrorstatues')}, glasskärvor ${share('mirror', 'shardlings')}`);
  const ms = B.mirror.mirShare / B.mirror.n;
  if (ms < 0.23 || ms > 0.32) fail('spegelväggarna är i snitt ' + (100 * ms).toFixed(0) + ' % av salarnas väggar (väntat ~27 %)');
  const br = B.fungus.d2brute / Math.max(1, B.fungus.d2v11), il = B.mirror.d2illu / Math.max(1, B.mirror.d2v11);
  if (br < 0.3 || br > 0.8) fail('mycelbestar på ' + (100 * br).toFixed(0) + ' % av svamprikets banor på djup 2+ (väntat ~55 %)');
  if (il < 0.3 || il > 0.8) fail('illusionister på ' + (100 * il).toFixed(0) + ' % av spegelpalatsets banor på djup 2+ (väntat ~55 %)');
  for (const id of BIOME_IDS) if (id !== 'fungus' && ['bouncepads', 'sporepools', 'capwalls', 'sporelings', 'mycelbrutes', 'shamans'].some(k => B[id].f11[k])) fail('svamprikets saker i ' + id);
  for (const id of BIOME_IDS) if (id !== 'mirror' && ['teleporters', 'mirrorwalls', 'mirrorknights', 'illusionists', 'shardlings'].some(k => B[id].f11[k])) fail('spegelpalatsets saker i ' + id);
  stats.v11 = `sporsäckar ${(100 * sOld / nOld).toFixed(0)} % av banorna i de gamla biomerna, svampriket ${(100 * share('fungus', 'sporesacks')).toFixed(0)} %; ` +
    `svampriket: studsplattor ${per('fungus', 'bouncepads').toFixed(1)} per bana, sporpölar ${per('fungus', 'sporepools').toFixed(1)} rutor (på ${(100 * share('fungus', 'sporepools')).toFixed(0)} %), ` +
    `glödsvampar ${per('fungus', 'glowshrooms').toFixed(1)}, svamphattar ${per('fungus', 'capwalls').toFixed(1)}, sporlingar på ${(100 * share('fungus', 'sporelings')).toFixed(0)} % (${(per('fungus', 'sporelings') / Math.max(0.01, share('fungus', 'sporelings'))).toFixed(1)} per bana med dem), ` +
    `mycelbestar ${(100 * br).toFixed(0)} % (djup 2+), svampshamaner ${per('fungus', 'shamans').toFixed(1)} per bana` +
    `\n  spegelpalatset: teleporterpar ${(per('mirror', 'teleporters') / 2).toFixed(1)} per bana (snitt avstånd ${(B.mirror.tpDist / Math.max(1, B.mirror.n11.teleporters / 2)).toFixed(1)} rutor), spegelväggar ${per('mirror', 'mirrorwalls').toFixed(0)} rutor (${(100 * ms).toFixed(0)} % av salarnas väggar), ` +
    `spegelstatyer ${per('mirror', 'mirrorstatues').toFixed(1)}, spegelriddare ${per('mirror', 'mirrorknights').toFixed(1)}, glasskärvor på ${(100 * share('mirror', 'shardlings')).toFixed(0)} %, illusionister ${(100 * il).toFixed(0)} % (djup 2+)`;
  let sinkOK = 0; for (const id of BIOME_IDS) sinkOK += B[id].sinkOK11 || 0;
  stats.sinkOK11 = sinkOK;
}

// ---- frö-stabilitet (version 11): samma seeds ger samma bana som version 10 (sporsäckar ovanpå); utan opts.biome ändras bara banorna som
// slår svampriket eller spegelpalatset; arenor, hemliga våningar och labyrinter är oförändrade ----
{
  if (!OldGen10) fail('frö-stabilitet: kunde inte läsa gen.js från version 10 (' + oldGen10Err + '); sätt GEN_OLD10=sökväg till den gamla filen');
  else {
    const OB = OldGen10.BIOMES.map(b => b.id), OG = Object.keys(OldGen10.GUARDIANS), OW = [null].concat(Object.values(OldGen10.WEAPONS));
    const KEYS = ['name', 'biome', 'guardian', 'theme', 'floor', 'floors', 'floorMask', 'roomMask', 'sky', 'rooms', 'fog', 'ambient', 'ceil', 'secretWall', 'boulders', 'beams', 'tide', 'saws', 'winds', 'depth', 'seed'];
    let sacks = 0, levels = 0, newB = 0, total = 0;
    const cmp = (a, b, tag) => {
      total++;
      for (const k of KEYS) if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) { fail(tag + ' frö-stabilitet: fältet ' + k + ' skiljer sig från version 10'); return; }
      if (!Array.isArray(b.teleports) || b.teleports.length) { fail(tag + ' frö-stabilitet: teleportrar i en gammal biom'); return; }
      let k = 0;
      for (let y = 0; y < a.map.length; y++) for (let x = 0; x < a.map[0].length; x++) {
        const o = a.map[y][x], c = b.map[y][x];
        if (o === c) continue;
        if (o === '.' && c === 'Ũ') { sacks++; k++; continue; }
        fail(`${tag} frö-stabilitet: "${o}" blev "${c}" vid ${x},${y}`); return;
      }
      for (const key in a.features) if (a.features[key] !== b.features[key]) { fail(tag + ' frö-stabilitet: features.' + key); return; }
      if (b.features.sporesacks !== k) fail(tag + ' frö-stabilitet: features.sporesacks');
      if (k) levels++;
    };
    for (let i = 0; i < 455; i++) { // alla tretton gamla biomer (35 var), alla gamla väktare och vapen
      const biome = OB[i % OB.length], depth = 1 + (i % 5), seed = i % 2 ? 'stabil11-' + i : 7171 + i * 7919;
      const opts = { biome, shop: i % 3 === 0, weapon: OW[i % OW.length], guardian: i % 4 === 3 ? undefined : OG[i % OG.length] };
      cmp(OldGen10.floor(seed, depth, opts), Gen.floor(seed, depth, opts), `[stabil11 ${biome} seed=${seed} d=${depth}]`);
    }
    for (let i = 0; i < 300; i++) { // utan opts.biome: bara banor som slår svampriket eller spegelpalatset ändras
      const depth = 1 + (i % 5), seed = 'stabilmix11-' + i, lv = Gen.floor(seed, depth, { shop: i % 2 === 0 });
      if (lv.biome === 'fungus' || lv.biome === 'mirror') { newB++; continue; }
      cmp(OldGen10.floor(seed, depth, { shop: i % 2 === 0 }), lv, `[stabil11 mix seed=${seed} d=${depth}]`);
    }
    if (newB < 12 || newB > 65) fail('frö-stabilitet (version 11): ' + newB + ' av 300 banor utan opts.biome slog de nya biomerna (väntat ~34)');
    // spelets anropsform (seed RNG.hash, djup, butik, vapen-id, väktare): samma sak
    for (let i = 0; i < 100; i++) {
      const pos = 1 + (i % 5), cyc = Math.floor(i / 5) % 3, depth = Math.min(5, pos + cyc), seed = RNG.hash('krypta11s-' + i + ':' + (pos + 6 * cyc));
      const opts = { shop: pos === 2 || pos === 4, weapon: OW[i % OW.length], biome: OB[i % OB.length], guardian: OG[i % OG.length] };
      cmp(OldGen10.floor(seed, depth, opts), Gen.floor(seed, depth, opts), `[stabil11 spel seed=${seed} d=${depth}]`);
    }
    const strip = o => { const c = Object.assign({}, o); delete c.features; delete c.teleports; return JSON.stringify(c); };
    for (const arena of OldGen10.ARENAS) for (const boss of [undefined, 'ghost']) if (strip(OldGen10.boss('st11-' + arena, { arena, boss })) !== strip(Gen.boss('st11-' + arena, { arena, boss }))) fail('frö-stabilitet: arenan ' + arena + ' ändrades');
    for (const id of OB) {
      if (strip(OldGen10.secret('st11s-' + id, { biome: id, depth: 2 })) !== strip(Gen.secret('st11s-' + id, { biome: id, depth: 2 }))) fail('frö-stabilitet: hemliga våningen ' + id + ' ändrades');
      if (strip(OldGen10.maze('st11m-' + id, { biome: id, depth: 3 })) !== strip(Gen.maze('st11m-' + id, { biome: id, depth: 3 }))) fail('frö-stabilitet: labyrinten ' + id + ' ändrades');
    }
    if (!sacks) fail('frö-stabilitet (version 11): inga sporsäckar i jämförelsen');
    stats.stable11 = `${total} banor (455 med gammal biom, ${300 - newB} utan opts.biome, 100 i spelets anropsform) identiska med version 10 (${GEN_V10_REF.slice(0, 7)}) utom ${sacks} sporsäckar på ${levels} banor; ` +
      `${newB} av 300 utan opts.biome blev fungus/mirror; arenor, hemliga våningar och labyrinter oförändrade`;
  }
}

// ---- frö-stabilitet: samma seeds med en gammal biom ger samma bana som version 7 (de nya sakerna ovanpå) ----
{
  if (!OldGen) fail('frö-stabilitet: kunde inte läsa gen.js från version 7 (' + oldGenErr + '); sätt GEN_OLD=sökväg till den gamla filen');
  else {
    const OB = OldGen.BIOMES.map(b => b.id), OG = Object.keys(OldGen.GUARDIANS), OW = [null].concat(Object.values(OldGen.WEAPONS));
    const ONTOP = 'ĀĂĞĠĢŊŋ', OLDFOE = OLD_EN + 'UXY!@^+ÅÄÖÉÜÑÆÞÐÝÃÕÊÎÔ';
    const KEYS = ['name', 'biome', 'guardian', 'theme', 'floor', 'floors', 'floorMask', 'roomMask', 'sky', 'rooms', 'fog', 'ambient', 'ceil', 'secretWall', 'boulders', 'beams', 'depth'];
    let onTop = 0, levelsOnTop = 0, newB = 0;
    const cmp = (a, b, tag) => {
      for (const k of KEYS) if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) { fail(tag + ' frö-stabilitet: fältet ' + k + ' skiljer sig från version 7'); return; }
      let k = 0;
      for (let y = 0; y < a.map.length; y++) for (let x = 0; x < a.map[0].length; x++) {
        const o = a.map[y][x], c = b.map[y][x];
        if (o === c) continue;
        if ((o === '.' && ONTOP.includes(c)) || (OLDFOE.includes(o) && (c === 'Ā' || c === 'Ă'))) { k++; continue; }
        if ((o === '.' && c === 'Œ') || ('SKVILNORWUXY!@^ÅÄÉÜ'.includes(o) && V10EN.includes(c))) continue; // version 10 ovanpå
        if (o === '.' && c === 'Ũ') continue; // version 11 ovanpå
        fail(`${tag} frö-stabilitet: "${o}" blev "${c}" vid ${x},${y}`); return;
      }
      for (const key in a.features) if (a.features[key] !== b.features[key]) { fail(tag + ' frö-stabilitet: features.' + key); return; }
      onTop += k; if (k) levelsOnTop++;
    };
    for (let i = 0; i < 300; i++) {
      const biome = OB[i % OB.length], depth = 1 + (i % 5), seed = i % 2 ? 'stabil' + i : 4242 + i * 7919;
      const opts = { biome, shop: i % 3 === 0, weapon: OW[i % OW.length], guardian: i % 4 === 3 ? undefined : OG[i % OG.length] };
      cmp(OldGen.floor(seed, depth, opts), Gen.floor(seed, depth, opts), `[stabil ${biome} seed=${seed} d=${depth}]`);
    }
    for (let i = 0; i < 300; i++) { // utan opts.biome: bara banor som slår de nya biomerna ändras
      const depth = 1 + (i % 5), seed = 'stabilmix' + i, lv = Gen.floor(seed, depth, { shop: i % 2 === 0 });
      if (['crystal', 'sunken', 'clock', 'sky', 'fungus', 'mirror'].includes(lv.biome)) { newB++; continue; }
      cmp(OldGen.floor(seed, depth, { shop: i % 2 === 0 }), lv, `[stabil mix seed=${seed} d=${depth}]`);
    }
    if (newB < 55 || newB > 150) fail('frö-stabilitet: ' + newB + ' av 300 banor utan opts.biome slog de nya biomerna (väntat ~98)');
    stats.stable = `300 banor med gammal biom + ${300 - newB} utan opts.biome identiska med version 7 utom ${onTop} nya rutor (Ā Ă Ğ Ġ Ģ Ŋ ŋ) på ${levelsOnTop} banor; ${newB} av 300 utan opts.biome blev crystal/sunken/clock/sky/fungus/mirror`;
  }
}

// ---- slumpad biom utan opts.biome: vikter och djupintervall ----
{
  const seen = {};
  for (let i = 0; i < 1000; i++) {
    const depth = 1 + (i % 5), lv = Gen.floor('mix' + i, depth, { shop: i % 4 === 0 });
    seen[lv.biome] = (seen[lv.biome] || 0) + 1;
    const b = Gen.BIOMES.find(b => b.id === lv.biome);
    if (!b || depth < b.depth[0] || depth > b.depth[1]) fail(`[mix${i} d=${depth}] biom ${lv.biome} utanför djupintervallet`);
    if (i < 200) for (const e of Gen.validate(lv)) fail(`[mix${i}] ${e}`);
  }
  for (const id of BIOME_IDS) if (!seen[id]) fail('biomen ' + id + ' valdes aldrig slumpmässigt');
  if (seen.dungeon < 160 || seen.dungeon > 500) fail('fängelsehålan valdes ' + seen.dungeon + ' av 1000 gånger');
  if (seen.volcano < 50 || seen.volcano > 150) fail('vulkanen valdes ' + seen.volcano + ' av 1000 gånger');
  if (seen.tomb < 50 || seen.tomb > 150) fail('gravkammaren valdes ' + seen.tomb + ' av 1000 gånger');
  if (seen.crystal < 40 || seen.crystal > 140) fail('kristallgrottorna valdes ' + seen.crystal + ' av 1000 gånger');
  if (seen.sunken < 40 || seen.sunken > 140) fail('sjunkna staden valdes ' + seen.sunken + ' av 1000 gånger');
  if (seen.clock < 35 || seen.clock > 130) fail('klocktornet valdes ' + seen.clock + ' av 1000 gånger');
  if (seen.sky < 35 || seen.sky > 130) fail('molnborgen valdes ' + seen.sky + ' av 1000 gånger');
  if (seen.fungus < 30 || seen.fungus > 110) fail('svampriket valdes ' + seen.fungus + ' av 1000 gånger');
  if (seen.mirror < 30 || seen.mirror > 110) fail('spegelpalatset valdes ' + seen.mirror + ' av 1000 gånger');
  stats.mix = BIOME_IDS.map(id => id + '=' + (seen[id] || 0)).join(' ');
  if (Gen.floor(5, 3, { theme: 'kapell' }).biome !== 'dungeon') fail('opts.theme ska ge fängelsehålan');
}

// ---- bossarenor ----
const bossMs = {};
for (const arena of ['hall', 'graveyard', 'cave', 'forest', 'swamp', 'frost', 'volcano', 'tomb', 'crystal', 'sunken', 'clock', 'sky', 'fungus', 'mirror']) {
  bossMs[arena] = 0;
  for (let i = 0; i < 30; i++) {
    const bossId = i % 6 === 5 ? undefined : GUARD_IDS[i % GUARD_IDS.length];
    const seed = i % 2 ? 'boss' + i : 500 + i * 31, opts = arena === 'hall' && i % 3 === 0 ? { boss: bossId } : { arena, boss: bossId };
    const [lv, ms] = timed(() => Gen.boss(seed, opts));
    bossMs[arena] += ms;
    const tag = `[boss ${arena} seed=${seed}]`;
    for (const e of Gen.validate(lv)) fail(tag + ' ' + e);
    const m = lv.map;
    if (count(m, 'B') !== 1 || count(m, 'G') !== 1 || count(m, 'x') !== 1 || count(m, 'P') !== 1) fail(tag + ' B/G/x/P antal');
    if (!lv.features || lv.features.water !== count(m, '-')) fail(tag + ' level.features');
    // (leviatans bassäng: vattnet når fram till bossen, men aldrig till P eller x)
    m.forEach((r, y) => [...r].forEach((c, x) => { if (HAZ.includes(c) && [-1, 0, 1].some(dy => [-1, 0, 1].some(dx => (arena === 'sunken' && 'ĐĔĜ'.includes(c) ? 'Px' : 'PxB').includes((m[y + dy] || '')[x + dx])))) fail(tag + ` ${c} intill P/x/B vid ${x},${y}`); }));
    for (const e of [...'ĐĒĔĖĚĜÓ']) if (count(m, e) && !(arena === 'crystal' ? 'Ė' : arena === 'sunken' ? 'ĐĔĜ' : '').includes(e)) fail(tag + ` ${e} i arenan ${arena}`);
    if ((arena === 'sunken') !== !!lv.tide) fail(tag + ' level.tide ' + JSON.stringify(lv.tide));
    if (arena === 'crystal') { // kristalltronen: ring av brytande kristaller runt den fria mitten, glödkristaller i stället för eldfat, ådror, inomhus
      const ring = [...m.join('')].filter(c => c === 'Ė').length;
      if (ring < 6 || ring > 8 || lv.features.breakcrystals !== ring) fail(tag + ' brytande kristaller i ringen ' + ring);
      m.forEach((r, y) => [...r].forEach((c, x) => { if (c === 'Ė') { const d = Math.hypot((x - 12) / 7, (y - 14) / 6); if (d < 0.75 || d > 1.3) fail(tag + ` brytande kristall utanför ringen vid ${x},${y}`); } }));
      if (count(m, 'f') || count(m, 'Ę') < 6 || !count(m, 'Ć')) fail(tag + ` ljus/ådror f${count(m, 'f')} Ę${count(m, 'Ę')} Ć${count(m, 'Ć')}`);
      if (lv.floors[0] !== 'floor_crystal' || lv.floors[1] !== 'floor_cave' || lv.biome !== 'crystal' || lv.sky !== null || lv.ceil !== 'ceil_cave') fail(tag + ' golv/biom/tak ' + lv.floors + ' ' + lv.biome);
    }
    if (arena === 'sunken') { // leviatans bassäng: stor bassäng i mitten som når bossen, gångar runt om, tidvatten och luftbubblor, utomhus
      const wet = count(m, 'Đ') + count(m, 'Ĝ');
      if (wet < 80) fail(tag + ' för liten bassäng ' + wet);
      for (let y = 10; y <= 18; y++) for (let x = 10; x <= 14; x++) if (!'ĐĜĔ'.includes(m[y][x])) fail(tag + ` bassängen täcker inte mitten vid ${x},${y} (${m[y][x]})`);
      if (!'ĐĜ'.includes(m[8][12])) fail(tag + ' vattnet når inte fram till bossen');
      if (count(m, 'Ĝ') < 2 || count(m, 'Ĝ') > 3 || count(m, 'Ĕ') < 8) fail(tag + ` luftbubblor ${count(m, 'Ĝ')} tidvatten ${count(m, 'Ĕ')}`);
      let wx0 = 99, wx1 = 0, wy1 = 0;
      m.forEach((r, y) => [...r].forEach((c, x) => { if ('ĐĜ'.includes(c)) { wx0 = Math.min(wx0, x); wx1 = Math.max(wx1, x); wy1 = Math.max(wy1, y); } }));
      if (wx0 < 4 || wx1 > 20 || wy1 > 21) fail(tag + ` bassängen når gångarna (${wx0}-${wx1}, ${wy1})`);
      const P = findCh(m, 'P'), dry = floodD(m, P[0], P[1], c => !isBlock(c) && !SINK.includes(c) || GATES.includes(c));
      for (const [x, y, what] of [[12, 3, 'grinden'], [12, 6, 'bossen']]) if (dry[y * 25 + x] < 0) fail(tag + ` gången till ${what} är stängd`);
      for (const [x0, x1, what] of [[1, 4, 'väster'], [20, 23, 'öster']]) { // gångarna runt bassängen: torra rutor i båda sidorna
        let k = 0; for (let y = 10; y <= 18; y++) for (let x = x0; x <= x1; x++) if (dry[y * 25 + x] >= 0) k++;
        if (k < 9) fail(tag + ` gången i ${what} är stängd (${k} torra rutor)`);
      }
      m.forEach((r, y) => [...r].forEach((c, x) => { if (c === 'Ĕ' && !N4.some(([dx, dy]) => 'ĐĜĔ'.includes(m[y + dy][x + dx]))) fail(tag + ` tidvatten långt från vattnet vid ${x},${y}`); }));
      if (lv.floors[0] !== 'floor_sunken_tiles' || lv.floors[1] !== 'floor_deepwater' || lv.floors[2] !== 'floor_shallow' || lv.biome !== 'sunken' || !lv.sky) fail(tag + ' golv/biom/himmel ' + lv.floors + ' ' + lv.biome);
      m.forEach((r, y) => [...r].forEach((c, x) => { if ('ĐĜ'.includes(c) && lv.floors[+lv.floorMask[y][x]] !== 'floor_deepwater') fail(tag + ` vatten utan floor_deepwater vid ${x},${y}`); }));
      if (!(lv.tide && lv.tide.period >= 24 && lv.tide.period <= 40)) fail(tag + ' level.tide');
    }
    if (arena === 'swamp' && count(m, '-') < 30) fail(tag + ' för lite vatten i träskarenan ' + count(m, '-'));
    if (!Array.isArray(lv.saws) || !Array.isArray(lv.winds)) fail(tag + ' level.saws/level.winds saknas');
    for (const e of [...'ĿŀŃńň']) if (count(m, e) && !(arena === 'clock' ? 'Ŀŀ' : arena === 'sky' ? 'Ńń' : '').includes(e)) fail(tag + ` ${e} i arenan ${arena}`);
    if (arena !== 'clock' && lv.saws.length) fail(tag + ' sågspår utanför urverkshallen');
    if (arena !== 'sky' && lv.winds.length) fail(tag + ' vind utanför stormfågelns näste');
    if (arena === 'clock') { // urverkshallen: sågspår längs väggarna (level.saws), två speglade tidsbubblor utanför mitten, kuggväggar, inomhus
      if (lv.saws.length < 4) fail(tag + ' för få sågspår ' + lv.saws.length);
      let cells = 0;
      for (const sw of lv.saws) {
        const { x0, y0, x1, y1 } = sw, len = Math.abs(x1 - x0) + Math.abs(y1 - y0) + 1, ux = Math.sign(x1 - x0), uy = Math.sign(y1 - y0);
        if ((x0 !== x1 && y0 !== y1) || len < 3 || len > 7) fail(tag + ' sågspår ' + JSON.stringify(sw));
        for (let k = 0; k < len; k++) {
          const x = x0 + ux * k, y = y0 + uy * k; cells++;
          if (m[y][x] !== 'Ŀ') fail(tag + ` sågspåret går utanför Ŀ vid ${x},${y}`);
          if (!(x === 1 || x === 23 || y === 4 || y === 25)) fail(tag + ` sågspåret ligger inte längs väggen vid ${x},${y}`);
        }
      }
      if (cells !== count(m, 'Ŀ')) fail(tag + ` level.saws täcker ${cells} av ${count(m, 'Ŀ')} Ŀ`);
      const bub = []; m.forEach((r, y) => [...r].forEach((c, x) => { if (c === 'ŀ') bub.push([x, y]); }));
      if (bub.length !== 2 || bub[0][1] !== bub[1][1] || bub[0][0] + bub[1][0] !== 24 || bub.some(([x, y]) => x >= 8 && x <= 16)) fail(tag + ' tidsbubblor ' + JSON.stringify(bub));
      if (!count(m, 'ĺ') || lv.floors[0] !== 'floor_brass' || lv.biome !== 'clock' || lv.sky !== null || lv.ceil !== 'floor_brass') fail(tag + ' kuggväggar/golv/biom/tak ' + lv.floors + ' ' + lv.biome);
      const P = findCh(m, 'P'), d = floodD(m, P[0], P[1], c => !isBlock(c) && !SINK.includes(c) || GATES.includes(c));
      if (d[3 * 25 + 12] < 0 || d[6 * 25 + 12] < 0) fail(tag + ' sågspåren stänger av vägen till grinden/bossen');
    }
    if (!Array.isArray(lv.teleports) || (arena === 'mirror' ? lv.teleports.length !== 1 : lv.teleports.length)) fail(tag + ' level.teleports ' + JSON.stringify(lv.teleports));
    for (const e of [...'ţŤťŝŞŠšŦŧ']) if (count(m, e) && !(arena === 'fungus' ? 'ţŤŝŞŦ' : arena === 'mirror' ? 'ťŠšŧ' : '').includes(e) && !(bossId === 'mycelmother' && e === 'Ŧ') && !(bossId === 'mirrorking' && e === 'ŧ')) fail(tag + ` ${e} i arenan ${arena}`);
    if (arena === 'fungus') { // mycelmoderns grotta: studsplattor i speglade par och sporpölar utanför mitten, glödsvampar, svamphattar, inomhus
      const pads = [], pools = [];
      m.forEach((r, y) => [...r].forEach((c, x) => { if (c === 'ţ') pads.push([x, y]); if (c === 'Ť') pools.push([x, y]); }));
      if (pads.length < 2 || pads.length > 4 || pads.some(([x, y]) => m[y][24 - x] !== 'ţ')) fail(tag + ' studsplattor ' + JSON.stringify(pads));
      if (pools.length < 4 || pools.some(([x, y]) => m[y][24 - x] !== 'Ť')) fail(tag + ' sporpölar ' + pools.length);
      for (const [x, y] of pads.concat(pools)) if (x >= 8 && x <= 16 && y >= 10 && y <= 18) fail(tag + ` studsplatta/sporpöl i mitten vid ${x},${y}`);
      if (count(m, 'f') || count(m, 'Ŧ') < 6 || !count(m, 'Ş')) fail(tag + ` ljus/svamphattar f${count(m, 'f')} Ŧ${count(m, 'Ŧ')} Ş${count(m, 'Ş')}`);
      if (lv.floors[0] !== 'floor_moss' || lv.floors[1] !== 'floor_cave' || lv.biome !== 'fungus' || lv.sky !== null || lv.ceil !== 'ceil_cave') fail(tag + ' golv/biom/tak ' + lv.floors + ' ' + lv.biome);
      const P = findCh(m, 'P'), d = floodD(m, P[0], P[1], c => !isBlock(c) && !SINK.includes(c) || GATES.includes(c));
      if (d[3 * 25 + 12] < 0 || d[6 * 25 + 12] < 0) fail(tag + ' studsplattor/sporpölar stänger av vägen till grinden/bossen');
      m.forEach((r, y) => [...r].forEach((c, x) => { if (!isBlock(c) && !SINK.includes(c) && d[y * 25 + x] < 0) fail(tag + ` ${c} nås bara över studsplattor/sporpölar vid ${x},${y}`); }));
    }
    if (arena === 'mirror') { // spegelkungens sal: spegelväggar (speglade segment), ett teleporterpar speglat utanför mitten, marmor, inomhus
      const tp = lv.teleports[0] || {}, a = tp.a || {}, b = tp.b || {};
      if (m[a.y] === undefined || m[a.y][a.x] !== 'ť' || m[b.y][b.x] !== 'ť' || a.y !== b.y || a.x + b.x !== 24 || count(m, 'ť') !== 2 || (a.x >= 8 && a.x <= 16)) fail(tag + ' teleporterpar ' + JSON.stringify(tp));
      for (const q of [a, b]) for (const [cx, cy, what] of [[12, 24, 'P'], [12, 7, 'B'], [12, 3, 'grinden'], [12, 1, 'x']]) if (Math.max(Math.abs(q.x - cx), Math.abs(q.y - cy)) <= 1) fail(tag + ` teleporter intill ${what}`);
      let edge = 0; m.forEach((r, y) => [...r].forEach((c, x) => { if (c === 'š' && (x === 0 || x === 24 || y === 26)) { edge++; if (m[y][24 - x] !== 'š') fail(tag + ` spegelväggen vid ${x},${y} saknar sin spegelbild`); } }));
      if (edge < 16) fail(tag + ' för få spegelväggar längs väggarna ' + edge);
      if (lv.floors[0] !== 'floor_marble' || lv.biome !== 'mirror' || lv.sky !== null || lv.ceil !== 'floor_marble') fail(tag + ' golv/biom/tak ' + lv.floors + ' ' + lv.biome);
      const P = findCh(m, 'P'), d = floodD(m, P[0], P[1], c => !isBlock(c) && !SINK.includes(c) || GATES.includes(c));
      m.forEach((r, y) => [...r].forEach((c, x) => { if (!isBlock(c) && !SINK.includes(c) && d[y * 25 + x] < 0) fail(tag + ` ${c} nås bara via teleportrarna vid ${x},${y}`); }));
    }
    if (arena === 'sky') { // stormfågelns näste: stor ö i tomrummet, terrass vid bossen, startö, små öar via broar, vind, blixtstänger, utomhus
      if (count(m, 'Ń') < 120) fail(tag + ' för lite tomrum ' + count(m, 'Ń'));
      for (let y = 10; y <= 18; y++) for (let x = 8; x <= 16; x++) if (m[y][x] === 'Ń') fail(tag + ` tomrum i mitten vid ${x},${y}`);
      for (const [cx, cy, what] of [[12, 24, 'P'], [12, 7, 'B'], [12, 4, 'grinden']]) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (m[cy + dy][cx + dx] === 'Ń') fail(tag + ` tomrum intill ${what}`);
      if (m[22][12] === 'Ń' || m[21][12] === 'Ń') fail(tag + ' ingen bro till startön');
      let west = 0, east = 0; for (let y = 4; y <= 25; y++) for (let x = 1; x <= 3; x++) { if (!isBlock(m[y][x])) west++; if (!isBlock(m[y][24 - x])) east++; }
      if (west < 4 || east < 4) fail(tag + ` små öar saknas (väster ${west}, öster ${east})`);
      if (count(m, 'ņ') < 2 || count(m, 'ń') !== lv.winds.length) fail(tag + ` blixtstänger ${count(m, 'ņ')} vind ${count(m, 'ń')}/${lv.winds.length}`);
      for (const { x, y, dx, dy } of lv.winds) if (m[y][x] !== 'ń' || Math.abs(dx) + Math.abs(dy) !== 1 || isBlock(m[y + dy][x + dx])) fail(tag + ' vindruta ' + JSON.stringify({ x, y, dx, dy }));
      if (lv.floors.join() !== 'floor_cloud,floor_void,floor_wind' + (bossId ? ',' + GUARD[bossId].floor : '') || lv.biome !== 'sky' || !lv.sky) fail(tag + ' golv/biom/himmel ' + lv.floors + ' ' + lv.biome);
      m.forEach((r, y) => [...r].forEach((c, x) => { if (c === 'Ń' && +lv.floorMask[y][x] !== 1) fail(tag + ` tomrum utan floor_void vid ${x},${y}`); if (c === 'ń' && +lv.floorMask[y][x] !== 2) fail(tag + ` vind utan floor_wind vid ${x},${y}`); }));
      const P = findCh(m, 'P'), d = floodD(m, P[0], P[1], c => !isBlock(c) || GATES.includes(c));
      m.forEach((r, y) => [...r].forEach((c, x) => { if (!isBlock(c) && d[y * 25 + x] < 0) fail(tag + ` ${c} nås bara över tomrummet vid ${x},${y}`); }));
    }
    if (arena === 'frost') { // ishallen: frusen sjö i mitten, pelare av Ø, istappar, inomhus, snö och frusen sten
      if (count(m, ':') < 30 || m[14][12] !== ':' && m[14][12] !== 'h' && m[14][12] !== 'a') fail(tag + ' ingen frusen sjö i mitten ' + count(m, ':'));
      if (count(m, 'Ø') < 60 + 8) fail(tag + ' för få pelare av Ø');
      if (count(m, 'Ç') < 2 || count(m, 'Ç') > 8 || lv.features.icicles !== count(m, 'Ç')) fail(tag + ' istappar ' + count(m, 'Ç'));
      if (lv.floors[0] !== 'floor_frost_stone' || lv.floors[1] !== 'floor_snow' || lv.biome !== 'frost') fail(tag + ' golv/biom ' + lv.floors + ' ' + lv.biome);
    }
    if (arena === 'volcano') { // obsidianhallen: vallgrav av lava runt den fria mitten, fyra broar, pelare av Ò, inomhus, basalt och aska
      if (count(m, '_') < 40) fail(tag + ' för lite lava i vallgraven ' + count(m, '_'));
      for (let y = 10; y <= 18; y++) for (let x = 8; x <= 16; x++) if (m[y][x] === '_') fail(tag + ` lava i mitten vid ${x},${y}`);
      for (const [x, y, what] of [[12, 8, 'norr'], [12, 9, 'norr'], [12, 20, 'söder'], [12, 21, 'söder'], [5, 14, 'väster'], [6, 14, 'väster'], [18, 14, 'öster'], [19, 14, 'öster']])
        if (m[y][x] === '_' || isBlock(m[y][x])) fail(tag + ` bron i ${what} är stängd vid ${x},${y} (${m[y][x]})`);
      let ring = 0; for (let y = 8; y <= 21; y++) for (let x = 5; x <= 19; x++) if (m[y][x] === '_') ring++;
      if (ring !== count(m, '_')) fail(tag + ' lava utanför vallgraven');
      if (count(m, 'Ò') < 60 + 8) fail(tag + ' för få pelare av Ò');
      if (lv.floors[0] !== 'floor_basalt' || lv.floors[1] !== 'floor_ash' || lv.biome !== 'volcano' || lv.sky !== null || lv.ceil !== 'floor_basalt') fail(tag + ' golv/biom/tak ' + lv.floors + ' ' + lv.biome);
      if (count(m, '¶')) fail(tag + ' lägereld i bossarenan');
    }
    if (arena === 'tomb') { // tempelhallen: kvicksandsring runt den fria mitten med fyra öppna passager, pelare, inomhus, guldplattor och sand
      if (count(m, '¯') < 30) fail(tag + ' för lite kvicksand i ringen ' + count(m, '¯'));
      for (const [x, y, what] of [[12, 9, 'norr'], [12, 10, 'norr'], [12, 18, 'söder'], [12, 19, 'söder'], [6, 14, 'väster'], [7, 14, 'väster'], [17, 14, 'öster'], [18, 14, 'öster']])
        if (m[y][x] === '¯' || isBlock(m[y][x])) fail(tag + ` passagen i ${what} är stängd vid ${x},${y} (${m[y][x]})`);
      let ring = 0; for (let y = 7; y <= 21; y++) for (let x = 4; x <= 20; x++) if (m[y][x] === '¯') ring++;
      if (ring !== count(m, '¯')) fail(tag + ' kvicksand utanför ringen');
      if (m[14][12] === '¯' || [-1, 0, 1].some(d => m[14 + d][12] === '¯' || m[14][12 + d] === '¯')) fail(tag + ' kvicksand i gropens mitt');
      const pillar = bossId ? GUARD[bossId].wall : 'È';
      if (count(m, pillar) < 60 + 6) fail(tag + ' för få pelare ' + pillar);
      if (lv.floors[0] !== 'floor_gold_tiles' || lv.floors[1] !== 'floor_sand' || lv.biome !== 'tomb' || lv.sky !== null || lv.ceil !== 'floor_sand') fail(tag + ' golv/biom/tak ' + lv.floors + ' ' + lv.biome);
      if (count(m, '²') > 5 || lv.features.quicksand !== count(m, '¯') || lv.features.sarcophagi !== count(m, '²')) fail(tag + ' sarkofager/features');
      if (count(m, '¶')) fail(tag + ' lägereld i bossarenan');
    }
    if (count(m, 'h') < 3 || count(m, 'a') < 3) fail(tag + ' för få h/a');
    if (count(m, 'f') + (arena === 'crystal' ? count(m, 'Ę') : arena === 'fungus' ? count(m, 'Ŧ') : 0) < 6) fail(tag + ' för få eldfat ' + count(m, 'f'));
    if (JSON.stringify(Gen.boss(seed, opts)) !== JSON.stringify(lv)) fail(tag + ' inte deterministisk');
    if (bossId) {
      // bossens väggtecken, golv och dekor
      const gd = GUARD[bossId], bf = lv.floors.indexOf(gd.floor);
      if (lv.boss !== bossId) fail(tag + ' level.boss ' + lv.boss);
      if (count(m, gd.wall) < 6) fail(tag + ` för få väggar ${gd.wall}: ${count(m, gd.wall)}`);
      if (bf < 0 || (arena === 'sunken' ? +lv.floorMask[7][12] : +lv.floorMask[14][12]) !== bf) fail(tag + ' bossens golv saknas i mitten'); // leviatans bassäng: där bossen står
      if (![...m.join('')].some(c => PROPS.includes(c))) fail(tag + ' ingen dekor');
      // samma layout som utan bosstema: alla väggar ligger på samma ställen (bara tecknet byts)
      const plain = Gen.boss(seed, Object.assign({}, opts, { boss: undefined })).map;
      if (arena === 'hall' && plain.some((r, y) => [...r].some((c, x) => isWall(c) !== isWall(m[y][x])))) fail(tag + ' bosstemat ändrar tronsalens form');
    } else if (lv.floors.some(f => f.startsWith('floor_boss_'))) fail(tag + ' bossgolv utan opts.boss');
    if (arena !== 'hall') {
      // fri mitt (9x9) för den stora bossen, och fritt runt bossen
      for (let y = 10; y <= 18; y++) for (let x = 8; x <= 16; x++) if (isBlock(m[y][x])) fail(tag + ` hinder ${m[y][x]} i mitten vid ${x},${y}`);
      if ([...'SKVILNORWEQZ'].some(c => count(m, c))) fail(tag + ' vanliga fiender i bossarenan');
      for (let y = 5; y <= 9; y++) for (let x = 10; x <= 14; x++) if (isBlock(m[y][x])) fail(tag + ` hinder ${m[y][x]} vid bossen ${x},${y}`);
      const outdoor = !['cave', 'frost', 'volcano', 'tomb', 'crystal', 'clock', 'fungus', 'mirror'].includes(arena);
      if (!!lv.sky !== outdoor) fail(tag + ' sky');
      const wall = { graveyard: '7', cave: '8', forest: '6', swamp: '0', frost: 'Ø', volcano: 'Ò', tomb: 'È', crystal: 'Ą', sunken: 'Ċ', clock: 'Ĺ', sky: 'Ľ', fungus: 'ŝ', mirror: 'Š' }[arena];
      if (m[0][0] !== wall) fail(tag + ' väggtecken ' + m[0][0]);
      if (outdoor && arena !== 'sunken' && arena !== 'sky' && count(m, 'n') + count(m, 't') < 4) fail(tag + ' för lite skydd');
    }
    if (!samples['boss:' + arena]) samples['boss:' + arena] = lv;
  }
}

// ---- hemliga skattvåningar (Gen.secret): alla utseenden ----
const secretMs = [];
{
  const looks = [undefined].concat(BIOME_IDS), names = new Set();
  for (let i = 0; i < 90; i++) {
    const biome = looks[i % looks.length], seed = i % 2 ? 'sec' + i : 9000 + i * 13, opts = biome ? { biome, depth: 1 + (i % 5) } : {};
    const [lv, ms] = timed(() => Gen.secret(seed, opts));
    secretMs.push(ms);
    const tag = `[secret ${biome || '(standard)'} seed=${seed}]`, m = lv.map;
    for (const e of Gen.validate(lv)) fail(tag + ' ' + e);
    if (lv.biome !== (biome || 'dungeon') || !lv.secret || typeof lv.name !== 'string' || lv.sky !== null) fail(tag + ' fält ' + lv.biome);
    names.add(lv.name);
    if (!Array.isArray(lv.floorMask) || !Array.isArray(lv.roomMask) || !lv.features || lv.floors[0] !== lv.floor) fail(tag + ' masker/features');
    for (const k in FEAT) if (lv.features[k] !== count(m, FEAT[k])) fail(tag + ' features.' + k);
    const types = lv.rooms.map(r => r.type);
    if (types.length < 2 || types.length > 4 || types[0] !== 'start' || types[types.length - 1] !== 'exit' || types.slice(1, -1).some(t => t !== 'treasure')) fail(tag + ' rum ' + types.join());
    if (count(m, 'C') < 2 || count(m, 'C') > 4 || count(m, '$') < 3 || count(m, 'ª') !== 1 || count(m, 'E') < 1 || count(m, 'E') > 3 || count(m, 'P') !== 1 || count(m, 'x') !== 1)
      fail(tag + ` innehåll C${count(m, 'C')} $${count(m, '$')} ª${count(m, 'ª')} E${count(m, 'E')}`);
    if ([...OLD_EN + NEW_EN + 'QZB'].some(c => count(m, c)) || [...HAZ].some(c => count(m, c))) fail(tag + ' vanliga fiender eller fällor på den hemliga våningen');
    for (const r of m) for (const c of r) if (isWall(c) && c !== lv.secretWall) { fail(tag + ' väggen ' + c); break; }
    const P = findCh(m, 'P');
    m.forEach((r, y) => [...r].forEach((c, x) => { if (c === 'E' && Math.hypot(x - P[0], y - P[1]) < 7) fail(tag + ' elit för nära P'); }));
    if (pathPX(m) < 0) fail(tag + ' ingen väg P->x');
    const d = floodD(m, P[0], P[1], c => !isBlock(c));
    m.forEach((r, y) => [...r].forEach((c, x) => { if ('CE$ª'.includes(c) && d[y * r.length + x] < 0) fail(tag + ` ${c} nås inte vid ${x},${y}`); }));
    if (JSON.stringify(Gen.secret(seed, opts)) !== JSON.stringify(lv)) fail(tag + ' inte deterministisk');
    if (!samples['secret:' + lv.biome]) samples['secret:' + lv.biome] = lv;
  }
  if (Gen.secret(1).biome !== 'dungeon' || Gen.secret(1, { biome: 'nope' }).biome !== 'dungeon') fail('Gen.secret: standardutseendet är inte dungeon');
  if (names.size < 8) fail('Gen.secret: för få namn ' + [...names].join());
  stats.secretNames = [...names].slice(0, 6).join(', ');
}

// ---- labyrinter (Gen.maze): alla utseenden ----
const mazeMs = [];
{
  const looks = [undefined].concat(BIOME_IDS), names = new Set();
  for (let i = 0; i < 60; i++) {
    const biome = looks[i % looks.length], seed = i % 2 ? 'maze' + i : 7000 + i * 17, opts = biome ? { biome, depth: 1 + (i % 5) } : { depth: 1 + (i % 5) };
    const [lv, ms] = timed(() => Gen.maze(seed, opts));
    mazeMs.push(ms);
    const tag = `[maze ${biome || '(standard)'} seed=${seed}]`, m = lv.map, H = m.length, W = m[0].length;
    for (const e of Gen.validate(lv)) fail(tag + ' ' + e);
    if (lv.biome !== (biome || 'dungeon') || !lv.maze || typeof lv.name !== 'string' || !Array.isArray(lv.floorMask) || !Array.isArray(lv.roomMask) || !lv.features) fail(tag + ' fält');
    names.add(lv.name);
    if (W < 40 || W > 50 || H < 40 || H > 50) fail(tag + ` storlek ${W}x${H}`);
    for (const k in FEAT) if (lv.features[k] !== count(m, FEAT[k])) fail(tag + ' features.' + k);
    const P = findCh(m, 'P'), X = findCh(m, 'x');
    if (Math.min(P[0], W - 1 - P[0]) > 8 || Math.min(P[1], H - 1 - P[1]) > 8) fail(tag + ` P ligger inte i ett hörn (${P})`);
    const d = floodD(m, P[0], P[1], c => !isBlock(c));
    let mx = 0; for (const v of d) mx = Math.max(mx, v);
    if (d[X[1] * W + X[0]] !== mx && d[X[1] * W + X[0]] < mx - 2) fail(tag + ` x ligger inte längst bort (${d[X[1] * W + X[0]]} av ${mx})`);
    if (d[X[1] * W + X[0]] < 1.5 * W) fail(tag + ` utgången för nära: ${d[X[1] * W + X[0]]} steg`);
    const en = [...OLD_EN + NEW_EN + 'E'].reduce((k, c) => k + count(m, c), 0);
    if (en < 8 || en > 14) fail(tag + ' fiender ' + en);
    if (count(m, '¼') < 2 || count(m, '¼') > 4 || count(m, 'þ') !== 1) fail(tag + ` lampolja ${count(m, '¼')} sidor ${count(m, 'þ')}`);
    const types = lv.rooms.map(r => r.type);
    if (types[0] !== 'start' || !types.includes('exit') || types.filter(t => t === 'treasure').length < 2 || count(m, 'C') < 2) fail(tag + ' rum ' + types.join() + ' kistor ' + count(m, 'C'));
    m.forEach((r, y) => [...r].forEach((c, x) => { if (ENEMIES.includes(c) && (Math.hypot(x - P[0], y - P[1]) < 7 || lv.roomMask[y][x] !== '-')) fail(tag + ' fiende för nära P eller i ett rum'); if (c !== '.' && c !== 'P' && !isWall(c) && !isBlock(c) && d[y * W + x] < 0) fail(tag + ` ${c} nås inte vid ${x},${y}`); }));
    // gångarna är 1-2 breda: ett helt öppet 3x3-block finns bara i rummen
    let wide3 = 0;
    for (let y = 1; y < H - 2; y++) for (let x = 1; x < W - 2; x++) {
      let open = true;
      for (let dy = 0; dy < 3 && open; dy++) for (let dx = 0; dx < 3; dx++) if (isWall(m[y + dy][x + dx])) { open = false; break; }
      if (open && lv.roomMask[y + 1][x + 1] === '-') wide3++;
    }
    if (wide3) fail(tag + ` ${wide3} öppna 3x3-block utanför rummen`);
    // slingor: fler öppningar än i ett träd (cellgrafen med 3 rutors delning)
    let edges = 0, cells = 0;
    for (let j = 0; 1 + 3 * j < H - 1; j++) for (let i = 0; 1 + 3 * i < W - 1; i++) {
      const x = 1 + 3 * i, y = 1 + 3 * j; cells++;
      if (x + 3 < W - 1 && !isWall(m[y][x + 2]) && lv.roomMask[y][x + 2] === '-') edges++;
      if (y + 3 < H - 1 && !isWall(m[y + 2][x]) && lv.roomMask[y + 2][x] === '-') edges++;
    }
    const loops = edges - (cells - 1 - 3 * types.filter(t => t === 'start' || t === 'treasure').length); // ett träd har noder - 1 öppningar (rummen är en nod)
    if (loops < 5) fail(tag + ` för få slingor (${loops})`);
    stats.mazeLoops = (stats.mazeLoops || 0) + loops;
    if (JSON.stringify(Gen.maze(seed, opts)) !== JSON.stringify(lv)) fail(tag + ' inte deterministisk');
    if (!samples['maze:' + lv.biome]) samples['maze:' + lv.biome] = lv;
  }
  if (Gen.maze(1).biome !== 'dungeon' || Gen.maze(1, { biome: 'nope' }).biome !== 'dungeon') fail('Gen.maze: standardutseendet är inte dungeon');
  if (names.size < 8) fail('Gen.maze: för få namn ' + [...names].join());
  stats.mazeNames = [...names].slice(0, 5).join(', ');
}

// ---- validate fångar fel ----
{
  const bad = Gen.floor(1, 1, { biome: 'dungeon' }), out = Gen.floor(3, 2, { biome: 'forest' });
  const hack = (lv, f) => { const l = JSON.parse(JSON.stringify(lv)); f(l); return Gen.validate(l).length; };
  if (!hack(bad, l => { l.map[0] = l.map[0].slice(0, -1); })) fail('validate: kort rad ej upptäckt');
  if (!hack(bad, l => { l.map[1] = '.' + l.map[1].slice(1); })) fail('validate: öppen kant ej upptäckt');
  if (!hack(bad, l => { l.map = l.map.map(r => r.replace('P', '.')); })) fail('validate: saknat P ej upptäckt');
  if (!hack(bad, l => { l.map = l.map.map(r => r.replace('x', '.')); })) fail('validate: saknat x ej upptäckt');
  if (!hack(bad, l => { const y = l.map.findIndex(r => r.includes('P')); const x = l.map[y].indexOf('P'); l.map[y] = l.map[y].slice(0, x + 1) + 'D' + l.map[y].slice(x + 2); })) fail('validate: dörr utan väggar ej upptäckt');
  if (!hack(out, l => { l.sky = l.sky.slice(1); })) fail('validate: fel storlek på sky ej upptäckt');
  if (!hack(out, l => { l.floorMask[3] = 'x' + l.floorMask[3].slice(1); })) fail('validate: ogiltig golvmask ej upptäckt');
  if (!hack(out, l => { l.floorMask[3] = '9' + l.floorMask[3].slice(1); })) fail('validate: golvindex utanför floors ej upptäckt');
  if (!hack(out, l => { l.roomMask[3] = 'z' + l.roomMask[3].slice(1); })) fail('validate: ogiltig rumsmask ej upptäckt');
  if (!hack(bad, l => { const y = l.map.findIndex(r => r.includes('P')), x = l.map[y].indexOf('P'); l.map[y] = l.map[y].slice(0, x + 1) + 'z' + l.map[y].slice(x + 2); })) fail('validate: spikfälla intill P ej upptäckt');
  if (!hack(bad, l => { l.map[3] = l.map[3].slice(0, 2) + 'ww' + l.map[3].slice(4); })) fail('validate: två brunnar ej upptäckt');
  if (!hack(bad, l => { l.floors = Array(11).fill(l.floor); })) fail('validate: för många golv ej upptäckt');
  if (!hack(bad, l => { l.map[3] = l.map[3].slice(0, 2) + '££' + l.map[3].slice(4); })) fail('validate: två alkemister ej upptäckt');
  if (!hack(bad, l => { const y = l.map.findIndex(r => r.includes('P')), x = l.map[y].indexOf('P'); l.map[y] = l.map[y].slice(0, x + 1) + 'Ç' + l.map[y].slice(x + 2); })) fail('validate: istapp intill P ej upptäckt');
  if (!hack(bad, l => { l.map[3] = l.map[3].slice(0, 2) + 'ł' + l.map[3].slice(3); })) fail('validate: okänt tecken ej upptäckt');
  if (!hack(out, l => { l.floors = ['floor_mud']; })) fail('validate: floors[0] != floor ej upptäckt');
  // version 6: tak, hemlig trappa utanför hemligt rum, pendelblad mitt i ett rum, lavamask utan lava, ¬ som enda vägen
  const msg = (lv, f, re) => { const l = JSON.parse(JSON.stringify(lv)); f(l); return Gen.validate(l).some(e => re.test(e)); };
  // en fri golvruta mitt i ett vanligt rum (inga väggar runt om, minst 2 från P, rummet har ingen hemlig vägg)
  const startDot = l => {
    const P = findCh(l.map, 'P'), m = l.map, ri = (x, y) => l.roomMask[y].charCodeAt(x) - 48;
    const secretRoom = k => m.some((r, y) => [...r].some((c, x) => ri(x, y) === k && N4.some(([dx, dy]) => '*{'.includes(m[y + dy][x + dx]))));
    for (let y = 1; y < m.length - 1; y++) for (let x = 1; x < m[0].length - 1; x++) {
      if (m[y][x] !== '.' || l.roomMask[y][x] === '-' || Math.max(Math.abs(x - P[0]), Math.abs(y - P[1])) < 2) continue;
      if (!['start', 'normal', 'elite', 'exit'].includes(l.rooms[ri(x, y)].type) || N4.some(([dx, dy]) => isBlock(m[y + dy][x + dx]))) continue;
      if (!secretRoom(ri(x, y))) return [x, y];
    }
    return null;
  };
  const putCh = (l, [x, y], ch) => { l.map[y] = l.map[y].slice(0, x) + ch + l.map[y].slice(x + 1); };
  if (!msg(bad, l => { l.map[3] = l.map[3].slice(0, 2) + '¶¶' + l.map[3].slice(4); }, /lägereldar/)) fail('validate: två lägereldar ej upptäckt');
  if (!msg(bad, l => { l.map[3] = l.map[3].slice(0, 2) + 'µßµß' + l.map[3].slice(6); }, /tunnor/)) fail('validate: fyra tunnor ej upptäckt');
  if (!startDot(bad)) fail('validate-test: ingen fri ruta i ett vanligt rum');
  else {
    if (!msg(bad, l => putCh(l, startDot(l), '÷'), /hemlig trappa utanför/)) fail('validate: hemlig trappa utanför hemligt rum ej upptäckt');
    if (!msg(bad, l => putCh(l, startDot(l), '±'), /pendelblad/)) fail('validate: pendelblad mitt i rummet ej upptäckt');
    if (!msg(bad, l => putCh(l, startDot(l), 'Þ'), /lavamask/)) fail('validate: lavamask utan lava ej upptäckt');
    if (!msg(bad, l => putCh(l, startDot(l), '¨'), /tryckplatta/)) fail('validate: tryckplatta utan hemlig vägg ej upptäckt');
  }
  { // smulande golv i en dörr-/korridorruta som är enda vägen: validate säger att något bara nås över lava/¬
    let found = false;
    for (let sd = 1; sd <= 12 && !found; sd++) {
    const lv0 = Gen.floor(sd, 1 + (sd % 5), { biome: 'dungeon' }), m = lv0.map;
    for (let y = 1; y < m.length - 1 && !found; y++) for (let x = 1; x < m[0].length - 1 && !found; x++) {
      if (m[y][x] !== '.' || lv0.roomMask[y][x] !== '-') continue;
      const ew = isWall(m[y - 1][x]) && isWall(m[y + 1][x]), ns = isWall(m[y][x - 1]) && isWall(m[y][x + 1]);
      if (!ew && !ns) continue;
      const l = JSON.parse(JSON.stringify(lv0)); putCh(l, [x, y], '¬');
      const reach = mm => floodD(mm, ...findCh(mm, 'P'), c => !isBlock(c) && c !== '¬' && c !== '_' && c !== 'z').reduce((k, v) => k + (v >= 0 ? 1 : 0), 0);
      if (reach(l.map) >= reach(m) - 1) continue; // inte enda vägen till något
      found = true;
      if (!Gen.validate(l).some(e => /lava\/spikar/.test(e))) fail('validate: smulande golv som enda vägen ej upptäckt');
    }
    }
    if (!found) fail('validate-test: hittade ingen korridorruta som är enda vägen');
  }
  // version 7: tak, bankir på första våningen, rullsten utan rak korridor, för många ljusschakt, kvicksand som enda vägen
  if (!msg(bad, l => { l.map[3] = l.map[3].slice(0, 2) + '²²²²²²' + l.map[3].slice(8); }, /sarkofager/)) fail('validate: sex sarkofager ej upptäckt');
  if (!msg(bad, l => { l.map[3] = l.map[3].slice(0, 2) + 'ÎÎ' + l.map[3].slice(4); }, /tjuvar/)) fail('validate: två tjuvar ej upptäckt');
  if (!startDot(bad)) fail('validate-test: ingen fri ruta i ett vanligt rum');
  else {
    if (!msg(bad, l => putCh(l, startDot(l), 'ÿ'), /bankir på första/)) fail('validate: bankir på första våningen ej upptäckt');
    if (!msg(bad, l => putCh(l, startDot(l), '¹'), /boulders|utlösare/)) fail('validate: utlösare utan level.boulders ej upptäckt');
    if (!msg(bad, l => { const [x, y] = startDot(l); putCh(l, [x, y], '¹'); l.boulders = [{ tx: x, ty: y, sx: x + 3, sy: y + 3 }]; }, /inte rak/)) fail('validate: sned rullstenskorridor ej upptäckt');
    if (!msg(bad, l => { const [x, y] = startDot(l); putCh(l, [x, y], '¹'); l.boulders = [{ tx: x, ty: y, sx: x + 2, sy: y }]; }, /för kort|blockerad/)) fail('validate: kort rullstenskorridor ej upptäckt');
  }
  if (!msg(bad, l => { const [x, y] = startDot(l) || [2, 2]; l.beams = Array(7).fill({ x, y }); }, /beams/)) fail('validate: sju ljusschakt ej upptäckt');
  if (!msg(out, l => { const y = l.sky.findIndex(r => r.includes('1')), x = l.sky[y].indexOf('1'); l.beams = [{ x, y }]; }, /ljusschakt/)) fail('validate: ljusschakt under öppen himmel ej upptäckt');
  {
    let found = false;
    for (let sd = 1; sd <= 12 && !found; sd++) {
      const lv0 = Gen.floor(sd, 1 + (sd % 5), { biome: 'dungeon' }), m = lv0.map;
      for (let y = 1; y < m.length - 1 && !found; y++) for (let x = 1; x < m[0].length - 1 && !found; x++) {
        if (m[y][x] !== '.' || lv0.roomMask[y][x] !== '-') continue;
        if (!((isWall(m[y - 1][x]) && isWall(m[y + 1][x])) || (isWall(m[y][x - 1]) && isWall(m[y][x + 1])))) continue;
        const l = JSON.parse(JSON.stringify(lv0)); putCh(l, [x, y], '¯');
        const reach = mm => floodD(mm, ...findCh(mm, 'P'), c => !isBlock(c) && !SINK.includes(c)).reduce((k, v) => k + (v >= 0 ? 1 : 0), 0);
        if (reach(l.map) >= reach(m) - 1) continue;
        found = true;
        if (!Gen.validate(l).some(e => /lava\/spikar/.test(e))) fail('validate: kvicksand som enda vägen ej upptäckt');
      }
    }
    if (!found) fail('validate-test: hittade ingen korridorruta som är enda vägen (kvicksand)');
  }
  // version 8: tak, nya tecken där de inte får vara, ål på land, tidvatten utan level.tide, vatten som enda vägen, ogiltigt level.tide
  {
    const sk = Gen.floor(11, 3, { biome: 'sunken' }), cr = Gen.floor(12, 3, { biome: 'crystal' });
    if (!msg(bad, l => { l.map[3] = l.map[3].slice(0, 2) + 'ĞĞ' + l.map[3].slice(4); }, /kartografer/)) fail('validate: två kartografer ej upptäckt');
    if (!msg(bad, l => { l.map[3] = l.map[3].slice(0, 2) + 'ĢĢĢ' + l.map[3].slice(5); }, /kunskapsböcker/)) fail('validate: tre kunskapsböcker ej upptäckt');
    if (!msg(bad, l => { l.map[3] = l.map[3].slice(0, 2) + 'ĀĀ' + l.map[3].slice(4); }, /skuggjägare/)) fail('validate: två skuggjägare ej upptäckt');
    if (!msg(cr, l => { l.map[3] = l.map[3].slice(0, 2) + 'ĖĖĖĖĖ' + l.map[3].slice(7); }, /brytande kristaller/)) fail('validate: fem brytande kristaller ej upptäckt');
    if (!msg(bad, l => { l.map[0] = 'Ą' + l.map[0].slice(1); }, /hör inte hemma/)) fail('validate: kristallvägg i fängelsehålan ej upptäckt');
    if (!msg(bad, l => putCh(l, startDot(l), 'Đ'), /hör inte hemma/)) fail('validate: djupt vatten i fängelsehålan ej upptäckt');
    if (!msg(bad, l => putCh(l, startDot(l), 'Ë'), /hör inte hemma/)) fail('validate: kristallgolem i fängelsehålan ej upptäckt');
    if (!startDot(sk)) fail('validate-test: ingen fri ruta i sjunkna staden');
    else {
      if (!msg(sk, l => putCh(l, startDot(l), 'Ó'), /ål utanför vattnet/)) fail('validate: ål på land ej upptäckt');
      const dryDot = l => { const m = l.map, P = findCh(m, 'P'); for (let y = 2; y < m.length - 2; y++) for (let x = 2; x < m[0].length - 2; x++) if (m[y][x] === '.' && Math.max(Math.abs(x - P[0]), Math.abs(y - P[1])) >= 2 && ![-1, 0, 1].some(dy => [-1, 0, 1].some(dx => SINK.includes(m[y + dy][x + dx])))) return [x, y]; return null; };
      if (!msg(sk, l => putCh(l, dryDot(l), 'Ĝ'), /luftbubblor utanför/)) fail('validate: luftbubblor på land ej upptäckt');
    }
    if (!msg(sk, l => { l.tide = null; }, /tidvatten/)) fail('validate: tidvatten utan level.tide ej upptäckt');
    if (!msg(sk, l => { l.tide = { period: 12 }; }, /level.tide/)) fail('validate: för kort tidvattenperiod ej upptäckt');
    // djupt vatten i en korridorruta som är enda vägen: något nås bara över vatten
    let found = false;
    for (let sd = 1; sd <= 12 && !found; sd++) {
      const lv0 = Gen.floor(sd, 1 + (sd % 5), { biome: 'sunken' }), m = lv0.map;
      for (let y = 1; y < m.length - 1 && !found; y++) for (let x = 1; x < m[0].length - 1 && !found; x++) {
        if (m[y][x] !== '.' || lv0.roomMask[y][x] !== '-') continue;
        if (!((isWall(m[y - 1][x]) && isWall(m[y + 1][x])) || (isWall(m[y][x - 1]) && isWall(m[y][x + 1])))) continue;
        const l = JSON.parse(JSON.stringify(lv0)); putCh(l, [x, y], 'Đ');
        const reach = mm => floodD(mm, ...findCh(mm, 'P'), c => !isBlock(c) && !SINK.includes(c)).reduce((k, v) => k + (v >= 0 ? 1 : 0), 0);
        if (reach(l.map) >= reach(m) - 1) continue;
        found = true;
        if (!Gen.validate(l).some(e => /lava\/spikar/.test(e))) fail('validate: djupt vatten som enda vägen ej upptäckt');
      }
    }
    if (!found) fail('validate-test: hittade ingen korridorruta som är enda vägen (vatten)');
  }
  // version 9: tak, nya tecken där de inte får vara, level.saws/level.winds som inte stämmer, sågspår/tidsbubbla som enda vägen,
  // tidsbubbla utanför rum, vind ut i tomrummet, tomrum intill P, något som bara nås över tomrummet
  {
    const ck = Gen.floor(21, 3, { biome: 'clock' }), sk = Gen.floor(22, 3, { biome: 'sky' });
    if (!msg(bad, l => { l.map[3] = l.map[3].slice(0, 2) + 'ŊŊŊŊ' + l.map[3].slice(6); }, /kugghjul/)) fail('validate: fyra kugghjul ej upptäckt');
    if (!msg(bad, l => { l.map[3] = l.map[3].slice(0, 2) + 'ŋŋ' + l.map[3].slice(4); }, /fjädrar/)) fail('validate: två fjädrar ej upptäckt');
    if (!msg(ck, l => { l.map[3] = l.map[3].slice(0, 2) + 'ŀŀŀŀ' + l.map[3].slice(6); }, /tidsbubblor/)) fail('validate: fyra tidsbubblor ej upptäckt');
    if (!msg(ck, l => { l.map[3] = l.map[3].slice(0, 2) + 'ŇŇ' + l.map[3].slice(4); }, /klockspel/)) fail('validate: två klockspel ej upptäckt');
    if (!msg(sk, l => { l.map[3] = l.map[3].slice(0, 2) + 'ĸĸĸ' + l.map[3].slice(5); }, /molnjättar/)) fail('validate: tre molnjättar ej upptäckt');
    if (!msg(sk, l => { l.map[3] = l.map[3].slice(0, 2) + 'ňňňň' + l.map[3].slice(6); }, /molnkistor/)) fail('validate: fyra molnkistor ej upptäckt');
    if (!msg(bad, l => { l.map[0] = 'Ĺ' + l.map[0].slice(1); }, /hör inte hemma/)) fail('validate: mässingsvägg i fängelsehålan ej upptäckt');
    if (!msg(ck, l => { l.map[0] = 'Ľ' + l.map[0].slice(1); }, /hör inte hemma/)) fail('validate: stormmur i klocktornet ej upptäckt');
    if (!msg(bad, l => putCh(l, startDot(l), 'Ń'), /hör inte hemma/)) fail('validate: tomrum i fängelsehålan ej upptäckt');
    if (!msg(bad, l => putCh(l, startDot(l), 'Ķ'), /hör inte hemma/)) fail('validate: harpya i fängelsehålan ej upptäckt');
    if (!msg(sk, l => putCh(l, startDot(l), 'ĳ'), /hör inte hemma/)) fail('validate: urverkssoldat i molnborgen ej upptäckt');
    if (!msg(bad, l => { l.map[0] = 'Ļ' + l.map[0].slice(1); }, /hör inte hemma/)) fail('validate: urmakarens vägg utan urmakaren ej upptäckt');
    if (!msg(bad, l => putCh(l, startDot(l), 'ņ'), /hör inte hemma/)) fail('validate: blixtstång i fängelsehålan ej upptäckt');
    // sågspår: Ŀ utan level.saws, level.saws som inte täcker kartan, snett eller för långt spår
    const ckS = Gen.floor(23, 4, { biome: 'clock' });
    if (!ckS.saws.length) fail('validate-test: klocktornet utan sågspår');
    else {
      if (!msg(ckS, l => { delete l.saws; }, /level.saws/)) fail('validate: Ŀ utan level.saws ej upptäckt');
      if (!msg(ckS, l => { l.saws = l.saws.slice(1); }, /level.saws täcker/)) fail('validate: sågspår som saknas i level.saws ej upptäckt');
      if (!msg(ckS, l => { const sw = l.saws[0]; l.saws[0] = { x0: sw.x0, y0: sw.y0, x1: sw.x0 + 1, y1: sw.y0 + 1 }; }, /inte rakt/)) fail('validate: snett sågspår ej upptäckt');
      if (!msg(ckS, l => { const sw = l.saws[0], hz = sw.y0 === sw.y1; l.saws[0] = { x0: sw.x0, y0: sw.y0, x1: hz ? sw.x0 + 8 * Math.sign(sw.x1 - sw.x0 || 1) : sw.x0, y1: hz ? sw.y0 : sw.y0 + 8 * Math.sign(sw.y1 - sw.y0 || 1) }; }, /rutor \(3-7\)|utanför Ŀ/)) fail('validate: för långt sågspår ej upptäckt');
      if (!msg(ckS, l => { const sw = l.saws[0]; putCh(l, [sw.x0, sw.y0], '.'); }, /utanför Ŀ/)) fail('validate: level.saws över golv ej upptäckt');
    }
    if (!msg(ck, l => { const p = startDot(l); putCh(l, p, 'Ŀ'); }, /level.saws/)) fail('validate: lös Ŀ utan spår ej upptäckt');
    // tidsbubbla i en korridor
    {
      const m = ck.map, P = findCh(m, 'P'); let spot = null;
      for (let y = 2; y < m.length - 2 && !spot; y++) for (let x = 2; x < m[0].length - 2; x++) if (m[y][x] === '.' && ck.roomMask[y][x] === '-' && Math.max(Math.abs(x - P[0]), Math.abs(y - P[1])) > 2 && !N4.some(([dx, dy]) => DOORS.includes(m[y + dy][x + dx]))) { spot = [x, y]; break; }
      if (!spot) fail('validate-test: ingen korridorruta i klocktornet');
      else if (!msg(ck, l => putCh(l, spot, 'ŀ'), /tidsbubbla utanför/)) fail('validate: tidsbubbla utanför rum ej upptäckt');
    }
    // vind: ń utan level.winds, fel riktning, vind som blåser ut i tomrummet
    if (!sk.winds.length) fail('validate-test: molnborgen utan vind');
    else {
      if (!msg(sk, l => { l.winds = l.winds.slice(1); }, /level.winds har/)) fail('validate: vindruta som saknas i level.winds ej upptäckt');
      if (!msg(sk, l => { l.winds[0] = Object.assign({}, l.winds[0], { dx: 1, dy: 1 }); }, /ogiltig riktning/)) fail('validate: diagonal vind ej upptäckt');
      if (!msg(sk, l => { const w = l.winds[0]; putCh(l, [w.x + w.dx, w.y + w.dy], 'Ń'); }, /tomrummet/)) fail('validate: vind ut i tomrummet ej upptäckt');
      if (!msg(sk, l => { delete l.winds; }, /level.winds/)) fail('validate: ń utan level.winds ej upptäckt');
    }
    // tomrum intill P, och en bro som blir tomrum (något nås då bara över tomrummet)
    if (!msg(sk, l => { const P = findCh(l.map, 'P'); const q = N4.map(([dx, dy]) => [P[0] + dx, P[1] + dy]).find(([x, y]) => l.map[y][x] === '.'); putCh(l, q, 'Ń'); }, /intill P/)) fail('validate: tomrum intill P ej upptäckt');
    for (const [ch, re, what] of [['Ń', /onåbar|nås inte|nås bara/, 'tomrum'], ['Ŀ', /lava\/spikar|level.saws/, 'sågspår'], ['ŀ', /lava\/spikar/, 'tidsbubbla']]) {
      let found = false;
      for (let sd = 1; sd <= 12 && !found; sd++) {
        const lv0 = Gen.floor('neg9-' + sd, 1 + (sd % 5), { biome: ch === 'Ń' ? 'sky' : 'clock' }), m = lv0.map;
        for (let y = 1; y < m.length - 1 && !found; y++) for (let x = 1; x < m[0].length - 1 && !found; x++) {
          if (m[y][x] !== '.' || lv0.roomMask[y][x] !== '-') continue;
          const l = JSON.parse(JSON.stringify(lv0)); putCh(l, [x, y], ch);
          const reach = mm => floodD(mm, ...findCh(mm, 'P'), c => !isBlock(c) && !SINK.includes(c)).reduce((k, v) => k + (v >= 0 ? 1 : 0), 0);
          if (reach(l.map) >= reach(m) - 1) continue; // inte enda vägen till något
          found = true;
          if (!Gen.validate(l).some(e => re.test(e))) fail(`validate: ${what} som enda vägen ej upptäckt`);
        }
      }
      if (!found) fail(`validate-test: hittade ingen korridorruta som är enda vägen (${what})`);
    }
  }
  // version 10: de nya fienderna utanför sin biom, i arenor och på hemliga våningar, på för litet djup, över taken, grävare intill vatten,
  // ensam rotvätte; legendaltare: två, i ett stridsrum, på djup 1, i en arena/labyrint, utan fri framsida, som enda vägen
  {
    const cv = Gen.floor(24, 3, { biome: 'caves' }), fo = Gen.floor(25, 3, { biome: 'forest' }), sw = Gen.floor(26, 3, { biome: 'swamp' }), co = Gen.floor(27, 3, { biome: 'courtyard' });
    const cv1 = Gen.floor(28, 1, { biome: 'caves' }), d3 = Gen.floor(29, 3, { biome: 'dungeon' });
    if (!msg(cv, l => putCh(l, startDot(l), 'Ō'), /hör inte hemma/)) fail('validate: fångvaktare i grottorna ej upptäckt');
    if (!msg(fo, l => putCh(l, startDot(l), 'Ŏ'), /hör inte hemma/)) fail('validate: likgrävare i skogen ej upptäckt');
    if (!msg(co, l => putCh(l, startDot(l), 'ŏ'), /hör inte hemma/)) fail('validate: rotvätte på borggården ej upptäckt');
    if (!msg(bad, l => putCh(l, startDot(l), 'ő'), /hör inte hemma/)) fail('validate: paddjätte i fängelsehålan ej upptäckt');
    if (!msg(sw, l => putCh(l, startDot(l), 'ō'), /hör inte hemma/)) fail('validate: grävare i träsket ej upptäckt');
    if (!msg(fo, l => putCh(l, startDot(l), 'Ő'), /hör inte hemma/)) fail('validate: armborstskytt i skogen ej upptäckt');
    if (!msg(cv1, l => putCh(l, startDot(l), 'ō'), /på djup 1/)) fail('validate: grävare på djup 1 ej upptäckt');
    if (!msg(Gen.floor(30, 1, { biome: 'swamp' }), l => putCh(l, startDot(l), 'ő'), /på djup 1/)) fail('validate: paddjätte på djup 1 ej upptäckt');
    if (!msg(d3, l => { l.map[3] = l.map[3].slice(0, 2) + 'ŌŌŌŌŌ' + l.map[3].slice(7); }, /för många Ō/)) fail('validate: fem fångvaktare ej upptäckt');
    if (!msg(d3, l => { l.map[3] = l.map[3].slice(0, 2) + 'ŎŎŎ' + l.map[3].slice(5); }, /för många Ŏ/)) fail('validate: tre likgrävare ej upptäckt');
    if (!msg(sw, l => { l.map[3] = l.map[3].slice(0, 2) + 'őőő' + l.map[3].slice(5); }, /för många ő/)) fail('validate: tre paddjättar ej upptäckt');
    if (!msg(fo, l => putCh(l, startDot(l), 'ŏ'), /rotvättar/)) fail('validate: ensam rotvätte ej upptäckt');
    if (!msg(fo, l => { l.map[3] = l.map[3].slice(0, 2) + 'ŏŏŏŏ' + l.map[3].slice(6); }, /för många ŏ/)) fail('validate: fyra rotvättar ej upptäckt');
    // grävare intill vatten (grottor med vatten -)
    let wetSpot = null;
    for (let sd = 1; sd <= 40 && !wetSpot; sd++) {
      const lv = Gen.floor('neg10w-' + sd, 3, { biome: 'caves' }), m = lv.map;
      for (let y = 1; y < m.length - 1 && !wetSpot; y++) for (let x = 1; x < m[0].length - 1; x++) if (m[y][x] === '.' && N4.some(([dx, dy]) => m[y + dy][x + dx] === '-')) { wetSpot = [lv, [x, y]]; break; }
    }
    if (!wetSpot) fail('validate-test: inga grottor med vatten');
    else if (!msg(wetSpot[0], l => putCh(l, wetSpot[1], 'ō'), /grävare i vattnet/)) fail('validate: grävare intill vatten ej upptäckt');
    // fiender och altare i arenor, hemliga våningar och labyrinter
    const arena = Gen.boss(31, { arena: 'graveyard' }), sec = Gen.secret(32, { biome: 'dungeon', depth: 3 }), mz = Gen.maze(33, { biome: 'forest', depth: 3 });
    const dotOf = l => { const P = findCh(l.map, 'P'); for (let y = 1; y < l.map.length - 1; y++) for (let x = 1; x < l.map[0].length - 1; x++) if (l.map[y][x] === '.' && Math.hypot(x - P[0], y - P[1]) > 7 && N4.every(([dx, dy]) => !isBlock(l.map[y + dy][x + dx]))) return [x, y]; return null; };
    if (!msg(arena, l => putCh(l, dotOf(l), 'Ŏ'), /hör inte hemma/)) fail('validate: likgrävare i en arena ej upptäckt');
    if (!msg(sec, l => putCh(l, dotOf(l), 'Ō'), /hör inte hemma/)) fail('validate: fångvaktare på en hemlig våning ej upptäckt');
    if (!msg(mz, l => putCh(l, dotOf(l), 'ŏ'), /hör inte hemma/)) fail('validate: rotvätte i en labyrint ej upptäckt');
    if (!msg(arena, l => putCh(l, dotOf(l), 'Œ'), /legendaltare här/)) fail('validate: legendaltare i en arena ej upptäckt');
    if (!msg(mz, l => putCh(l, dotOf(l), 'Œ'), /legendaltare här/)) fail('validate: legendaltare i en labyrint ej upptäckt');
    if (!msg(sec, l => putCh(l, dotOf(l), 'Œ'), /legendaltare här/)) fail('validate: legendaltare på en hemlig våning ej upptäckt');
    // legendaltare: två, i ett stridsrum, på djup 1, i en korridor, utan fri framsida
    const calmDot = l => { const m = l.map; for (let y = 2; y < m.length - 2; y++) for (let x = 2; x < m[0].length - 2; x++) { const k = l.roomMask[y][x]; if (m[y][x] === '.' && k !== '-' && ['treasure', 'shrine'].includes(l.rooms[k.charCodeAt(0) - 48].type) && N4.every(([dx, dy]) => !isBlock(m[y + dy][x + dx]))) return [x, y]; } return null; };
    const combatDot = l => { const m = l.map; for (let y = 2; y < m.length - 2; y++) for (let x = 2; x < m[0].length - 2; x++) { const k = l.roomMask[y][x]; if (m[y][x] === '.' && k !== '-' && ['normal', 'elite', 'exit'].includes(l.rooms[k.charCodeAt(0) - 48].type) && N4.every(([dx, dy]) => !isBlock(m[y + dy][x + dx]))) return [x, y]; } return null; };
    if (!calmDot(d3) || !combatDot(d3)) fail('validate-test: ingen fri ruta i skattrummet/ett stridsrum');
    else {
      if (Gen.validate((l => (putCh(l, calmDot(l), 'Œ'), l))(JSON.parse(JSON.stringify(d3)))).length) fail('validate-test: legendaltare i skattrummet underkänns: ' + Gen.validate((l => (putCh(l, calmDot(l), 'Œ'), l))(JSON.parse(JSON.stringify(d3))))[0]);
      if (!msg(d3, l => { putCh(l, calmDot(l), 'Œ'); putCh(l, combatDot(l), 'Œ'); }, /för många legendaltare/)) fail('validate: två legendaltare ej upptäckt');
      if (!msg(d3, l => putCh(l, combatDot(l), 'Œ'), /legendaltare i normal|legendaltare i elite|legendaltare i exit/)) fail('validate: legendaltare i ett stridsrum ej upptäckt');
      if (!msg(d3, l => { const p = calmDot(l); putCh(l, p, 'Œ'); for (const [dx, dy] of N4) putCh(l, [p[0] + dx, p[1] + dy], 'T'); }, /fri framsida/)) fail('validate: legendaltare utan fri framsida ej upptäckt');
    }
    if (!calmDot(bad)) fail('validate-test: inget skattrum med fri ruta på djup 1');
    else if (!msg(bad, l => putCh(l, calmDot(l), 'Œ'), /djup 1/)) fail('validate: legendaltare på djup 1 ej upptäckt');
    // legendaltare som enda vägen (en korridorruta som är enda vägen till något): nåbarheten underkänns
    let found = false;
    for (let sd = 1; sd <= 12 && !found; sd++) {
      const lv0 = Gen.floor('neg10-' + sd, 2 + (sd % 4), { biome: 'dungeon' }), m = lv0.map;
      for (let y = 1; y < m.length - 1 && !found; y++) for (let x = 1; x < m[0].length - 1 && !found; x++) {
        if (m[y][x] !== '.' || lv0.roomMask[y][x] !== '-') continue;
        const l = JSON.parse(JSON.stringify(lv0)); putCh(l, [x, y], 'Œ');
        const reach = mm => floodD(mm, ...findCh(mm, 'P'), c => !isBlock(c) && !SINK.includes(c)).reduce((k, v) => k + (v >= 0 ? 1 : 0), 0);
        if (reach(l.map) >= reach(m) - 1) continue;
        found = true;
        if (!Gen.validate(l).some(e => /onåbar|nås inte|nås bara/.test(e))) fail('validate: legendaltare som enda vägen ej upptäckt');
      }
    }
    if (!found) fail('validate-test: hittade ingen korridorruta som är enda vägen (legendaltare)');
  }
  // version 11: svamprikets och spegelpalatsets tecken utanför sin biom, fiender på för litet djup och över taken, sporsäckar i en arena,
  // level.teleports som inte stämmer (saknat par, fel ruta, samma rum, utan level.teleports), spegelvägg på en dörrkarm, teleporter intill en
  // dörr, studsplatta intill P, och studsplatta/sporpöl/teleporter som enda vägen
  {
    const d3fn = () => Gen.floor(29, 3, { biome: 'dungeon' });
    const fu = Gen.floor(41, 3, { biome: 'fungus' }), mi = Gen.floor(42, 3, { biome: 'mirror' }), fu1 = Gen.floor(43, 1, { biome: 'fungus' }), mi1 = Gen.floor(44, 1, { biome: 'mirror' });
    if (Gen.validate(fu).length || Gen.validate(mi).length) fail('validate-test: svampriket/spegelpalatset underkänns: ' + Gen.validate(fu).concat(Gen.validate(mi))[0]);
    for (const [lv, ch, what] of [[bad, 'ţ', 'studsplatta i fängelsehålan'], [bad, 'Ť', 'sporpöl i fängelsehålan'], [fu, 'ť', 'teleporter i svampriket'], [mi, 'ŗ', 'sporling i spegelpalatset'],
      [fu, 'Ś', 'spegelriddare i svampriket'], [d3fn(), 'Ŧ', 'glödsvamp i fängelsehålan'], [d3fn(), 'ŧ', 'spegelstaty i fängelsehålan'], [mi, 'Ř', 'mycelbest i spegelpalatset'], [fu, 'Ŝ', 'glasskärva i svampriket']])
      if (!msg(lv, l => putCh(l, startDot(l), ch), /hör inte hemma/)) fail(`validate: ${what} ej upptäckt`);
    for (const [lv, ch, wall] of [[bad, 'Š', 'marmor i fängelsehålan'], [bad, 'š', 'spegelvägg i fängelsehålan'], [mi, 'ŝ', 'svampvägg i spegelpalatset'], [fu, 'ş', 'mycelmoderns vägg utan mycelmodern'], [fu, 'Ţ', 'spegelkungens vägg utan spegelkungen']]) {
      if (lv.guardian === 'mycelmother' && ch === 'ş') continue;
      if (!msg(lv, l => { l.map[0] = ch + l.map[0].slice(1); }, /hör inte hemma/)) fail(`validate: ${wall} ej upptäckt`);
    }
    if (!msg(fu1, l => putCh(l, startDot(l), 'Ř'), /på djup 1/)) fail('validate: mycelbest på djup 1 ej upptäckt');
    if (!msg(fu1, l => putCh(l, startDot(l), 'ř'), /på djup 1/)) fail('validate: svampshaman på djup 1 ej upptäckt');
    if (!msg(mi1, l => putCh(l, startDot(l), 'ś'), /på djup 1/)) fail('validate: illusionist på djup 1 ej upptäckt');
    if (!msg(fu, l => { l.map[3] = l.map[3].slice(0, 2) + 'ŘŘŘ' + l.map[3].slice(5); }, /för många mycelbestar/)) fail('validate: tre mycelbestar ej upptäckt');
    if (!msg(mi, l => { l.map[3] = l.map[3].slice(0, 2) + 'śśś' + l.map[3].slice(5); }, /för många illusionister/)) fail('validate: tre illusionister ej upptäckt');
    if (!msg(bad, l => { l.map[3] = l.map[3].slice(0, 2) + 'ŨŨŨ' + l.map[3].slice(5); }, /för många sporsäckar/)) fail('validate: tre sporsäckar ej upptäckt');
    if (!msg(fu, l => { l.map[3] = l.map[3].slice(0, 2) + 'ţţţţţ' + l.map[3].slice(7); }, /för många studsplattor/)) fail('validate: fem studsplattor ej upptäckt');
    if (!msg(Gen.boss(45, { arena: 'fungus' }), l => putCh(l, [12, 20], 'Ũ'), /sporsäck i en arena/)) fail('validate: sporsäck i en arena ej upptäckt');
    // level.teleports
    if (!mi.teleports.length) fail('validate-test: spegelpalatset utan teleportrar');
    else {
      if (!msg(mi, l => { l.teleports = l.teleports.slice(1); }, /level.teleports har/)) fail('validate: teleporterpar som saknas i level.teleports ej upptäckt');
      if (!msg(mi, l => { l.teleports[0] = { a: l.teleports[0].a, b: { x: 0, y: 0 } }; }, /pekar inte på två ť/)) fail('validate: teleporterpar med fel ruta ej upptäckt');
      if (!msg(mi, l => { delete l.teleports; }, /level.teleports/)) fail('validate: ť utan level.teleports ej upptäckt');
      if (!msg(mi, l => { l.teleports.push({ a: l.teleports[0].a, b: l.teleports[0].b }); }, /två par/)) fail('validate: teleporter i två par ej upptäckt');
      if (!msg(mi, l => { const { a } = l.teleports[0]; l.teleports[0] = { a, b: a }; }, /samma ruta|två par/)) fail('validate: teleporterpar på samma ruta ej upptäckt');
      // b flyttas till en annan ruta i a:s rum
      const sameRoom = l => { const { a, b } = l.teleports[0], k = l.roomMask[a.y][a.x]; for (let y = 1; y < l.map.length - 1; y++) for (let x = 1; x < l.map[0].length - 1; x++) if (l.roomMask[y][x] === k && l.map[y][x] === '.' && Math.max(Math.abs(x - a.x), Math.abs(y - a.y)) >= 2) { putCh(l, [b.x, b.y], '.'); putCh(l, [x, y], 'ť'); l.teleports[0] = { a, b: { x, y } }; return true; } return false; };
      if (!msg(mi, l => sameRoom(l), /två olika rum/)) fail('validate: teleporterpar i samma rum ej upptäckt');
    }
    // spegelvägg på en dörrkarm, teleporter intill en dörr, studsplatta intill P
    const frame = l => { const m = l.map; for (let y = 1; y < m.length - 1; y++) for (let x = 1; x < m[0].length - 1; x++) if (m[y][x] === 'D') for (const [dx, dy] of N4) if (m[y + dy][x + dx] === 'Š') return [[x + dx, y + dy], [x, y]]; return null; };
    const fr = frame(mi);
    if (!fr) fail('validate-test: ingen dörr med karm i spegelpalatset');
    else {
      if (!msg(mi, l => putCh(l, fr[0], 'š'), /dörrkarm/)) fail('validate: spegelvägg på en dörrkarm ej upptäckt');
      const nextTo = N4.map(([dx, dy]) => [fr[1][0] + dx, fr[1][1] + dy]).find(([x, y]) => mi.map[y][x] === '.');
      if (nextTo && !msg(mi, l => { putCh(l, nextTo, 'ť'); l.teleports.push({ a: { x: nextTo[0], y: nextTo[1] }, b: l.teleports[0].a }); }, /teleporter intill en dörr/)) fail('validate: teleporter intill en dörr ej upptäckt');
    }
    if (!msg(fu, l => { const P = findCh(l.map, 'P'); const q = N4.map(([dx, dy]) => [P[0] + dx, P[1] + dy]).find(([x, y]) => l.map[y][x] === '.'); putCh(l, q, 'ţ'); }, /intill P/)) fail('validate: studsplatta intill P ej upptäckt');
    // studsplatta, sporpöl och teleporter som enda vägen till något: nåbarheten underkänns
    for (const [ch, biome] of [['ţ', 'fungus'], ['Ť', 'fungus'], ['ť', 'mirror']]) {
      let found = false;
      for (let sd = 1; sd <= 12 && !found; sd++) {
        const lv0 = Gen.floor('neg11-' + sd, 1 + (sd % 5), { biome }), m = lv0.map, P = findCh(m, 'P');
        const reach = mm => floodD(mm, P[0], P[1], c => !isBlock(c) && !SINK.includes(c)).reduce((k, v) => k + (v >= 0 ? 1 : 0), 0), base = reach(m);
        for (let y = 1; y < m.length - 1 && !found; y++) for (let x = 1; x < m[0].length - 1 && !found; x++) {
          if (m[y][x] !== '.' || N4.filter(([dx, dy]) => !isBlock(m[y + dy][x + dx])).length !== 2) continue; // en ruta i en gång
          const m2 = m.slice(); m2[y] = m2[y].slice(0, x) + ch + m2[y].slice(x + 1);
          if (reach(m2) >= base - 1) continue; // inte enda vägen till något
          const l = JSON.parse(JSON.stringify(lv0)); putCh(l, [x, y], ch);
          found = true;
          if (!Gen.validate(l).some(e => /lava\/spikar|onåbar/.test(e))) fail(`validate: ${ch} som enda vägen ej upptäckt`);
        }
      }
      if (!found) fail(`validate-test: hittade ingen ruta som är enda vägen (${ch})`);
    }
  }
  // en ring av träd runt P stänger in spelaren
  if (!hack(out, l => { const y = l.map.findIndex(r => r.includes('P')), x = l.map[y].indexOf('P'); for (let dy = -1; dy <= 1; dy++) l.map[y + dy] = l.map[y + dy].split('').map((c, xx) => (Math.abs(xx - x) <= 1 && (dy || xx !== x) && !(c >= '1' && c <= '9') ? 't' : c)).join(''); })) fail('validate: instängd av träd ej upptäckt');
}

const show = lv => { console.log(`\n${lv.name} (${lv.biome}${lv.arena ? ':' + lv.arena : ''}) djup ${lv.depth} ${lv.map[0].length}x${lv.map.length} ambient ${lv.ambient}`); console.log(lv.map.join('\n')); };
if (process.argv.includes('--show')) for (const k in samples) show(samples[k]);

console.log('\n---');
const avg = a => a.reduce((s, v) => s + v, 0) / a.length;
for (const id of BIOME_IDS) {
  const s = B[id];
  console.log(`${id.padEnd(10)} ${String(s.n).padStart(3)} banor  tid snitt ${avg(s.ms).toFixed(1)} ms max ${Math.max(...s.ms).toFixed(1)} ms  storlek ${Math.sqrt(s.cells / s.n).toFixed(0)}^2  öppet ${(100 * s.open / s.n).toFixed(0)} %` +
    `  P->x ${(s.px / s.n).toFixed(2)} (min ${s.pxMin.toFixed(2)})  områden ${(s.areas / s.n).toFixed(1)}  t/n ${(s.props / s.n).toFixed(0)}  hemligt ${(100 * s.secret / s.n).toFixed(0)} %` +
    (s.sky ? `  himmel ${(100 * s.sky / s.n).toFixed(0)} %` : '') + (s.extra ? '  ' + s.extra : ''));
}
console.log('Fiendesorter (alla biomer): ' + [...OLD_EN + NEW_EN].map(c => c + '=' + BIOME_IDS.reduce((n, id) => n + (B[id]['typ' + c] || 0), 0)).join(' '));
console.log('Fiendemix per biom (andel av vanliga fiender, %):');
for (const id of BIOME_IDS) { const s = B[id], tot = [...OLD_EN + NEW_EN].reduce((n, c) => n + (s['typ' + c] || 0), 0); console.log(`  ${id.padEnd(10)} ` + [...OLD_EN + NEW_EN].filter(c => s['typ' + c]).map(c => c + '=' + (100 * s['typ' + c] / tot).toFixed(0)).join(' ') + `   nya ${(100 * [...NEW_EN].reduce((n, c) => n + (s['typ' + c] || 0), 0) / tot).toFixed(0)} %`); }
console.log('Nya saker per biom (andel banor med saken %, snitt antal per bana):');
const FK = Object.keys(FEAT).concat([',', "'", '}']);
for (const id of BIOME_IDS) { const s = B[id]; console.log(`  ${id.padEnd(10)} ` + FK.map(k => `${k}=${(100 * (s.feat[k] || 0) / s.n).toFixed(0)}%/${((s.featN[k] || 0) / s.n).toFixed(1)}`).join(' ')); }
console.log('Valv (antal): ' + BIOME_IDS.map(id => `${id} spak ${B[id].vault.lever} lås ${B[id].vault.key} (utmejslade ${B[id].vault.pocket})`).join(', '));
console.log(`Träsket: vattenandel ${(100 * B.swamp.wet / B.swamp.n).toFixed(0)} % av gångbara rutor, hyddor ${(B.swamp.huts / B.swamp.n).toFixed(1)} per bana`);
console.log(`Frostfästet: gårdar ${(B.frost.yards / B.frost.n).toFixed(1)} per bana, is ${(B.frost.ice / B.frost.n).toFixed(0)} rutor, istappar ${(B.frost.icic / B.frost.n).toFixed(1)}, istronsalar ${B.frost.throne || 0}`);
console.log(`Vulkanen: askfält ${(B.volcano.yards / B.volcano.n).toFixed(1)} per bana, lava ${(B.volcano.lavaN / B.volcano.n).toFixed(0)} rutor (på ${(100 * B.volcano.lavaL / B.volcano.n).toFixed(0)} %), broar ${(B.volcano.bridges / B.volcano.n).toFixed(1)} rutor, lavamaskar ${(B.volcano.worms / B.volcano.n).toFixed(1)} (på ${(100 * B.volcano.wormL / B.volcano.n).toFixed(0)} %)`);
console.log('Vulkanen med spelets opts (vaktare, butik, vapen): ' + stats.volcGame);
console.log('Version 6 (andel banor, alla biomer): ' + stats.v6 + `; smulande golv kontrollerat med ¬ som vägg på ${stats.crumble} banor`);
console.log(`Hemliga våningar: 90 st, snitt ${avg(secretMs).toFixed(2)} ms, t.ex. ${stats.secretNames}`);
{
  const t = B.tomb;
  console.log(`Gravkammaren: gårdar ${(t.yards / t.n).toFixed(1)} per bana, gravkamrar ${(t.burial / t.n).toFixed(1)}, pelarsalar ${(t.pillar / t.n).toFixed(1)}, sarkofager ${(t.sarc / t.n).toFixed(1)}, hieroglyfväggar ${(t.glyph / t.n).toFixed(0)}, kvicksand ${(t.qs / t.n).toFixed(1)} rutor (på ${(100 * t.qsL / t.n).toFixed(0)} %, ${((t.qsPatches || 0) / t.n).toFixed(1)} fläckar), rullstenskorridor snitt ${((t.boulderLen || 0) / Math.max(1, t.f7.boulders)).toFixed(1)} rutor`);
}
console.log('Gravkammaren med spelets opts: ' + stats.tombGame);
console.log('Version 7 (andel banor, alla biomer): ' + stats.v7 + `; kvicksand kontrollerad med ¯ som vägg på ${stats.qsOK} banor`);
console.log('Version 7 per biom (andel banor %): ' + BIOME_IDS.map(id => id + ' ' + ['scarabs', 'mummy', 'jackal', 'thief', 'doppel', 'sarcophagi', 'bells', 'gambler', 'banker', 'wanderer', 'pages', 'batteries', 'stones', 'quicksand', 'boulders', 'beams'].filter(k => B[id].f7[k]).map(k => k + '=' + (100 * B[id].f7[k] / B[id].n).toFixed(0)).join(' ')).join('\n  '));
console.log(`Labyrinter: 60 st, snitt ${avg(mazeMs).toFixed(2)} ms, slingor ${(stats.mazeLoops / 60).toFixed(1)} per labyrint, t.ex. ${stats.mazeNames}`);
console.log('NPC:er m.m. (andel banor, alla biomer): ' + stats.npc);
{
  const c = B.crystal, k = B.sunken;
  console.log(`Kristallgrottorna: glödkristaller ${(c.glow / c.n).toFixed(1)} per bana, brytande kristaller ${(c.prism / c.n).toFixed(1)} (på ${(100 * c.prismL / c.n).toFixed(0)} %), kristallspikar ${(c.spk / c.n).toFixed(1)} rutor (på ${(100 * c.spkL / c.n).toFixed(0)} %), ådror ${(100 * c.veins / c.n).toFixed(0)} % av de synliga väggarna`);
  console.log(`Sjunkna staden: djupt vatten ${(k.wet / k.n).toFixed(0)} rutor, tidvatten ${(k.tide / k.n).toFixed(1)} (på ${(100 * k.tideL / k.n).toFixed(0)} %), luftbubblor ${(k.bub / k.n).toFixed(1)}, ålar ${(k.eels / k.n).toFixed(1)} (på ${(100 * k.eelL / k.n).toFixed(0)} %), vrakkistor ${(k.wreck / k.n).toFixed(1)} (vattenskatter på holmar ${k.islet || 0}), korall ${(k.coral / k.n).toFixed(0)} väggrutor`);
}
console.log('Version 8 med spelets opts: ' + stats.v8Game.join('; '));
console.log('Version 8 (andel banor, alla biomer): ' + stats.v8 + `; vatten/spikar/tidvatten kontrollerade som vägg på ${stats.wetOK} banor`);
console.log('Version 8 per biom (andel banor %): ' + BIOME_IDS.map(id => id + ' ' + Object.keys(B[id].f8).filter(k => B[id].f8[k]).map(k => k + '=' + (100 * B[id].f8[k] / B[id].n).toFixed(0)).join(' ')).join('\n  '));
console.log('Frö-stabilitet: ' + (stats.stable || 'EJ KONTROLLERAD'));
{
  const c = B.clock, k = B.sky;
  console.log(`Klocktornet: sågspår ${(c.tracks / c.n).toFixed(1)} per bana (${(c.sawN / c.n).toFixed(1)} rutor, på ${(100 * c.sawL / c.n).toFixed(0)} %), tidsbubblor ${(c.bub / c.n).toFixed(1)}, urverk ${(c.cw / c.n).toFixed(1)}, kuggväggar ${(c.gw / c.n).toFixed(0)}, klockspel på ${(100 * c.chime / c.n).toFixed(0)} %, kuggspindlar på ${(100 * c.spid / c.n).toFixed(0)} %`);
  console.log(`Molnborgen: tomrum ${(100 * k.void / k.n).toFixed(0)} % av kartan, murar ${(k.walls / k.n).toFixed(0)} rutor, brorutor vid tomrummet ${(k.bridge / k.n).toFixed(0)}, vind ${(k.wind / k.n).toFixed(1)} rutor (på ${(100 * k.windL / k.n).toFixed(0)} %), blixtstänger ${(k.rods / k.n).toFixed(1)}, molnkistor ${(k.chests / k.n).toFixed(1)}, molnjättar ${(k.giants / k.n).toFixed(2)}, tomrum i vaktarens sal ${(k.gvoid / k.n).toFixed(1)} rutor`);
}
console.log('Version 9 med spelets opts: ' + stats.v9Game.join('; '));
console.log('Version 9 (andel banor): ' + stats.v9 + `; sågspår/tidsbubblor kontrollerade som vägg på ${stats.sawOK} banor, tomrummet på ${stats.voidOK}`);
console.log('Version 9 per biom (andel banor %): ' + BIOME_IDS.map(id => id + ' ' + Object.keys(B[id].f9).filter(k => B[id].f9[k]).map(k => k + '=' + (100 * B[id].f9[k] / B[id].n).toFixed(0)).join(' ')).join('\n  '));
console.log('Frö-stabilitet (version 9): ' + (stats.stable9 || 'EJ KONTROLLERAD'));
console.log('Version 10 med spelets opts (100 banor per gammal biom): ' + stats.v10Game.join(', '));
console.log('Version 10 (andel banor där saken får finnas, snitt antal på banorna med den):\n  ' + stats.v10);
console.log('Frö-stabilitet (version 10): ' + (stats.stable10 || 'EJ KONTROLLERAD'));
{
  const f = B.fungus, k = B.mirror;
  console.log(`Svampriket: studsplattor ${(f.pads / f.n).toFixed(1)} per bana, sporpölar ${(f.pools / f.n).toFixed(1)} rutor i ${(f.patches / f.n).toFixed(1)} fläckar (på ${(100 * f.poolL / f.n).toFixed(0)} %), svamphattar ${(f.caps / f.n).toFixed(0)}, glödsvampar ${(f.shrooms / f.n).toFixed(1)}, sporlingar på ${(100 * f.spl / f.n).toFixed(0)} %, mycelbestar ${(f.brutes / f.n).toFixed(2)} per bana`);
  console.log(`Spegelpalatset: teleporterpar ${(k.tp / k.n).toFixed(1)} per bana, spegelväggar ${(k.mw / k.n).toFixed(0)} rutor, spegelstatyer ${(k.statues / k.n).toFixed(1)}, glasskärvor på ${(100 * k.shard / k.n).toFixed(0)} %, illusionister ${(k.illu / k.n).toFixed(2)} per bana`);
}
console.log('Version 11 med spelets opts: ' + stats.v11Game.join('; '));
console.log('Version 11 (andel banor, snitt antal):\n  ' + stats.v11 + `\n  studsplattor/sporpölar/teleportrar kontrollerade som vägg på ${stats.sinkOK11} banor`);
console.log('Frö-stabilitet (version 11): ' + (stats.stable11 || 'EJ KONTROLLERAD'));
console.log('\nFiender per rum (alla rum utom start: antal fiender -> antal rum):');
for (const id of BIOME_IDS) { const h = B[id].hist; console.log(`  ${id.padEnd(10)} ` + Object.keys(h).sort((a, b) => a - b).map(k => k + ':' + h[k]).join(' ') + `   fiender/budget ${(B[id].enRel / B[id].n).toFixed(2)}  mimics ${B[id].mimic}  P->Z ${(B[id].gdist / B[id].n).toFixed(2)} (min ${B[id].gmin.toFixed(2)}) av längsta vägen`); }
console.log('Rekvisita per bana:');
for (const id of BIOME_IDS) { const p = B[id].propN; console.log(`  ${id.padEnd(10)} ` + [...PROPS].filter(c => p[c]).map(c => c + '=' + (p[c] / B[id].n).toFixed(1)).join(' ')); }
console.log('Rumstyper (antal):');
for (const id of BIOME_IDS) { const a = B[id].arch; console.log(`  ${id.padEnd(10)} ` + Object.keys(a).sort((u, v) => a[v] - a[u]).map(k => k + '=' + a[k]).join(' ')); }
console.log('Slumpad biom (1000 st): ' + stats.mix);
console.log('Bossarenor 14 x 30: ' + Object.entries(bossMs).map(([k, v]) => `${k} ${(v / 30).toFixed(2)} ms`).join(', '));
console.log(`Omförsök i generatorn: ${Gen.floor.stats.retries - stats.retries0} (varav ombyggen utan version 7: ${Gen.floor.stats.v7off}; underkända banor där version 8-sakerna togs bort igen: ${Gen.floor.stats.v8off}, version 9-sakerna: ${Gen.floor.stats.v9off}, version 10-sakerna: ${Gen.floor.stats.v10off}, version 11-sakerna: ${Gen.floor.stats.v11off})`);
if (failures) { console.log(`\n${failures} FEL`); process.exit(1); }
console.log('\nALLA TESTER OK');
