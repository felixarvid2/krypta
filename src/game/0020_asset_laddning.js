// ---------- Asset-laddning ----------
const A = 'assets/';
let loadN = 0; // laddningsförlopp
const load = src => new Promise((res, rej) => { const i = new Image(); i.onload = () => { loadN++; res(i); }; i.onerror = () => { loadN++; rej(new Error('saknas: ' + src)); }; i.src = src; });
const sndCache = {}; // ljudfilerna hämtas i bakgrunden medan du är på startskärmen
function prefetchSounds() { for (const n of SOUNDS) if (!sndCache[n]) sndCache[n] = fetch(`${A}snd/${n}.ogg`).then(r => r.ok ? r.arrayBuffer() : null).catch(() => null); }
function pixels(img, w = img.width, h = img.height, sx = 0, sy = 0, sw = w, sh = h) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
  return { w, h, data: new Uint32Array(g.getImageData(0, 0, w, h).data.buffer) };
}
const strip = (img, n, scale = 1) => { const fw = Math.floor(img.width / n); return [...Array(n)].map((_, i) => pixels(img, Math.round(fw * scale), Math.round(img.height * scale), i * fw, 0, fw, img.height)); };
const grid = (img, fw, fh, cols, rows) => { const out = []; for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) out.push(pixels(img, fw, fh, c * fw, r * fh, fw, fh)); return out; };
const tex = {}, spr = {}, fx = {}, snd = {}, enemyFrames = {}, wimg = {}, bossFx = {};
const ENEMY_DEFS = {
  Q: { name: 'MIMIC', sheet: 'mimic', move: 'movement', hp: 12, speed: 1.9, melee: true, dmg: 15, range: 0.95, cd: 0.85, size: 0.95, growl: 'growl', score: 300, atkFps: 14, hitAt: 0.5, tip: 'KISTAN HADE TÄNDER' },
  U: { name: 'SPINDEL', sheet: 'spider', fw: 64, move: 'movement', hp: 6, speed: 2.2, melee: true, dmg: 8, range: 0.95, cd: 0.9, size: 1.2, growl: 'spider', score: 150, atkFps: 14, hitAt: 0.5, ai: 'spider', tip: 'SPOTTAR NÄT SOM SAKTAR NED' },
  X: { name: 'FLADDERMUS', sheet: 'bat', move: 'movement', hp: 2, speed: 3.4, melee: true, dmg: 5, range: 0.8, cd: 0.8, size: 0.7, growl: 'bat', score: 60, atkFps: 16, hitAt: 0.5, ai: 'fly', tip: 'FLYGER I FLOCK – SNABB MEN SKÖR' },
  Y: { name: 'HELVETESHUND', sheet: 'hound', fw: 64, move: 'movement', hp: 7, speed: 2.8, melee: true, dmg: 10, range: 0.95, cd: 0.9, size: 1.3, growl: 'hound', score: 180, atkFps: 14, hitAt: 0.5, ai: 'leap', tip: 'HOPPAR PÅ DIG – TRÄFFA DEN I SPRÅNGET' },
  '!': { name: 'BOMBSKELETT', sheet: 'bomber', fw: 64, move: 'movement', hp: 5, speed: 2.4, melee: true, dmg: 0, range: 1.2, cd: 1, size: 1.0, growl: 'fuse', score: 160, atkFps: 12, hitAt: 0.9, ai: 'bomb', tip: 'SPRÄNGER SIG SJÄLV – SKJUT PÅ AVSTÅND' },
  '@': { name: 'SKÖLDBÄRARE', sheet: 'shieldman', fw: 64, move: 'movement', hp: 10, speed: 1.2, melee: true, dmg: 12, range: 1.05, cd: 1.1, size: 1.05, growl: 'growl', score: 220, atkFps: 12, hitAt: 0.5, ai: 'shield', tip: 'SKÖLDEN STOPPAR SKOTT – GÅ RUNT ELLER SPRÄNG' },
  '^': { name: 'SVAMPMAN', sheet: 'shroom', fw: 64, move: 'movement', hp: 8, speed: 0.7, melee: false, dmg: 4, range: 4, cd: 3.5, size: 1.1, growl: 'spore', score: 140, atkFps: 12, hitAt: 0.5, ai: 'spore', tip: 'SLÄPPER GIFTMOLN' },
  '+': { name: 'LEVANDE RUSTNING', sheet: 'livearmor', fw: 64, move: 'movement', hp: 16, speed: 1.1, melee: true, dmg: 15, range: 1.05, cd: 1.2, size: 1.1, growl: 'shield_block', score: 260, atkFps: 12, hitAt: 0.55, armor: 2, tip: 'RUSTNINGEN VAKNAR NÄR DU KOMMER NÄRA' },
  'Å': { name: 'GHOUL', sheet: 'ghoul', move: 'movement', hp: 6, speed: 2.5, melee: true, dmg: 9, range: 0.95, cd: 0.8, size: 1.05, growl: 'ghoul', score: 160, atkFps: 14, hitAt: 0.5, ai: 'ghoul', tip: 'ÄTER LIK FÖR ATT LÄKA' },
  'Ä': { name: 'KULTIST', sheet: 'cultist', move: 'movement', hp: 7, speed: 1.0, melee: false, dmg: 6, range: 8, cd: 2.6, size: 1.05, growl: 'cultist', score: 220, atkFps: 10, hitAt: 0.6, ai: 'cultist', proj: 'orb', kite: 4, tip: 'FÖRBANNAR DIG OCH STÄRKER ANDRA' },
  'Ö': { name: 'GARGOYL', sheet: 'gargoyle', move: 'movement', hp: 14, speed: 2.0, melee: true, dmg: 13, range: 1.0, cd: 1.0, size: 1.15, growl: 'gargoyle', score: 260, atkFps: 12, hitAt: 0.5, ai: 'fly', stone: true, tip: 'STEN: KULOR BITER DÅLIGT, SPRÄNG DEN' },
  'É': { name: 'ISVARG', sheet: 'icewolf', move: 'movement', hp: 6, speed: 2.9, melee: true, dmg: 9, range: 0.95, cd: 0.85, size: 1.35, growl: 'icewolf', score: 170, atkFps: 14, hitAt: 0.5, ai: 'leap', frostBite: true, tip: 'BETTET SAKTAR NED – JAGAR I FLOCK' },
  'Ñ': { name: 'NEKROMANT', sheet: 'necromancer', move: 'movement', hp: 8, speed: 1.0, melee: false, dmg: 7, range: 8, cd: 2.4, size: 1.0, growl: 'necromancer', score: 300, atkFps: 10, hitAt: 0.6, ai: 'necro', proj: 'skull', kite: 5, tip: 'VÄCKER DE DÖDA – DÖDA HONOM FÖRST' },
  'Æ': { name: 'ELDELEMENTAL', sheet: 'fireelemental', move: 'movement', hp: 7, speed: 1.6, melee: false, dmg: 8, range: 7, cd: 2.0, size: 1.0, growl: 'fire_elemental', score: 200, atkFps: 12, hitAt: 0.5, ai: 'elemental', proj: 'fire', kite: 2.5, fireproof: true, tip: 'DELAR SIG I FLAMMOR NÄR DEN DÖR' },
  'Þ': { name: 'LAVAMASK', sheet: 'lavaworm', move: 'movement', hp: 10, speed: 2.4, melee: true, dmg: 12, range: 1.1, cd: 1.2, size: 1.2, growl: 'lavaworm', score: 260, atkFps: 12, hitAt: 0.5, ai: 'worm', fireproof: true, tip: 'GRÄVER SIG UNDER DIG – FLYTTA DIG NÄR MARKEN GLÖDER' },
  'Ð': { name: 'DÖDSRIDDARE', sheet: 'deathknight', move: 'movement', hp: 22, speed: 1.1, melee: true, dmg: 15, range: 1.1, cd: 1.3, size: 1.15, growl: 'deathknight', score: 450, atkFps: 10, hitAt: 0.55, ai: 'knight', armor: 0.4, tip: 'SKÖLDEN SKYDDAR FRAMIFRÅN – ANFALL BAKIFRÅN' },
  'Ý': { name: 'BANSHEE', sheet: 'banshee', move: 'movement', hp: 6, speed: 1.6, melee: true, dmg: 7, range: 1.0, cd: 1.1, size: 1.0, growl: 'banshee', score: 230, atkFps: 10, hitAt: 0.5, ai: 'banshee', tip: 'SKRIKET SAKTAR NED OCH FÖRVIRRAR' },
  'Ã': { name: 'MUMIE', sheet: 'mummy', move: 'movement', hp: 12, speed: 0.85, melee: true, dmg: 11, range: 1.0, cd: 1.3, size: 1.05, growl: 'mummy', score: 240, atkFps: 10, hitAt: 0.55, ai: 'mummy', tip: 'BANDAGET DRAR DIG NÄRMARE' },
  'Õ': { name: 'SKARABÉ', sheet: 'scarab', move: 'movement', hp: 1.6, speed: 2.6, melee: true, dmg: 4, range: 0.8, cd: 0.7, size: 0.65, growl: 'scarab', score: 40, atkFps: 14, hitAt: 0.5, ai: 'scarab', tip: 'KOMMER I SVÄRMAR – SPRÄNG DEM' },
  'Ê': { name: 'SCHAKALKRIGARE', sheet: 'jackal', move: 'movement', hp: 11, speed: 1.7, melee: true, dmg: 12, range: 1.05, cd: 1.0, size: 1.1, growl: 'jackal', score: 280, atkFps: 12, hitAt: 0.5, ai: 'jackal', tip: 'PARERAR NÄR DU SIKTAR – VÄNTA UT DEN' },
  'Î': { name: 'FICKTJUV', sheet: 'thief', move: 'movement', hp: 5, speed: 2.9, melee: true, dmg: 2, range: 0.9, cd: 1.2, size: 1.0, growl: 'thief', score: 150, atkFps: 12, hitAt: 0.5, ai: 'thief', cowardly: true, tip: 'STJÄL GULD – DÖDA DEN FÖR ATT FÅ TILLBAKA DET' },
  'Ô': { name: 'DUBBELGÅNGARE', sheet: 'doppelganger', move: 'movement', hp: 14, speed: 1.4, melee: false, dmg: 6, range: 9, cd: 1.6, size: 1.3, growl: 'doppel', score: 380, atkFps: 10, hitAt: 0.5, ai: 'doppel', kite: 4, tip: 'SKJUTER MED DITT VAPEN' },
  'Ë': { name: 'KRISTALLGOLEM', sheet: 'crystalgolem', move: 'movement', hp: 30, speed: 0.75, melee: true, dmg: 17, range: 1.3, cd: 1.6, size: 0.9, growl: 'golem', score: 450, atkFps: 9, hitAt: 0.6, ai: 'golem', stone: true, crystal: true, tip: 'SLÅR SÖNDER MARKEN – HOPPA. HAMMARE OCH SPRÄNGMEDEL BITER' },
  'Í': { name: 'SKÄRVIRRBLOSS', sheet: 'shardwisp', move: 'movement', hp: 5, speed: 1.8, melee: false, dmg: 6, range: 9, cd: 99, size: 0.65, growl: 'shardwisp', score: 170, atkFps: 10, hitAt: 0.5, ai: 'shardwisp', kite: 4, crystal: true, float: true, tip: 'HOPPAR UNDAN NÄR DEN TRÄFFAS' },
  'Ï': { name: 'DRUNKNAD SJÖMAN', sheet: 'sailor', move: 'movement', hp: 9, speed: 1.2, melee: true, dmg: 10, range: 1.0, cd: 1.1, size: 1.05, growl: 'sailor', score: 200, atkFps: 11, hitAt: 0.55, ai: 'sailor', tip: 'BÅTSHAKEN DRAR DIG NÄRMARE' },
  'Ó': { name: 'ÅL', sheet: 'eel', move: 'movement', hp: 7, speed: 2.4, melee: true, dmg: 11, range: 1.5, cd: 99, size: 1.0, growl: 'eel', score: 160, atkFps: 12, hitAt: 0.5, ai: 'eel', tip: 'HÅLL DIG BORTA FRÅN DJUPT VATTEN' },
  'Ú': { name: 'SIREN', sheet: 'siren', move: 'movement', hp: 8, speed: 1.0, melee: false, dmg: 0, range: 9, cd: 99, size: 0.85, growl: 'siren_song', score: 260, atkFps: 8, hitAt: 0.5, ai: 'siren', kite: 5, tip: 'SÅNGEN DRAR DIG – SKJUT HENNE FÖR ATT BRYTA DEN' },
  'Û': { name: 'JÄTTEKRABBA', sheet: 'crab', move: 'movement', hp: 10, speed: 1.6, melee: true, dmg: 8, range: 0.95, cd: 1.0, size: 0.9, growl: 'crab', score: 180, atkFps: 12, hitAt: 0.5, ai: 'crab', tip: 'SKALET SKYDDAR FRAMIFRÅN – SLÅ, SPRÄNG ELLER GÅ RUNT' },
  'Ā': { name: 'SKUGGJÄGARE', sheet: 'stalker', move: 'movement', hp: 8, speed: 2.5, melee: true, dmg: 14, range: 1.0, cd: 0.9, size: 1.1, growl: 'stalker', score: 300, atkFps: 14, hitAt: 0.5, ai: 'stalker', tip: 'SYNS BARA I LJUS – TÄND LAMPAN' },
  'Ă': { name: 'HÄXA', sheet: 'witch', move: 'movement', hp: 9, speed: 1.1, melee: false, dmg: 5, range: 9, cd: 99, size: 1.05, growl: 'witch', score: 280, atkFps: 10, hitAt: 0.5, ai: 'witch', kite: 5, tip: 'FÖRHÄXAR DIG OCH TELEPORTERAR SIG NÄR HON TRÄFFAS' },
  'ƫ': { name: 'STENÄNGEL', sheet: 'weepingangel', move: 'movement', hp: 22, speed: 3.0, melee: true, dmg: 16, range: 1.0, cd: 1.0, size: 1.1, growl: 'angel_scrape', score: 360, atkFps: 12, hitAt: 0.5, ai: 'weepingangel', stone: true, tip: 'RÖR SIG BARA NÄR DU INTE TITTAR – HÅLL ÖGONEN PÅ DEN' },
  'Ƭ': { name: 'TAGGRANKA', sheet: 'thornvine', move: 'movement', hp: 12, speed: 0, melee: true, dmg: 9, range: 2.8, cd: 1.6, size: 1.1, growl: 'thornvine', score: 180, atkFps: 10, hitAt: 0.55, ai: 'thornvine', tip: 'NÅR LÅNGT MEN RÖR SIG INTE – SKJUT PÅ AVSTÅND ELLER BRÄNN DEN' },
  'ƭ': { name: 'TRÄDGÅRDSDRÄNG', sheet: 'gardener', move: 'movement', hp: 13, speed: 1.1, melee: true, dmg: 12, range: 1.1, cd: 1.2, size: 1.0, growl: 'gardener', score: 240, atkFps: 10, hitAt: 0.55, ai: 'gardener', tip: 'KLIPPER HÅRT – HÅLL AVSTÅND' },
  'Ʈ': { name: 'DRÖMÄTARE', sheet: 'dreameater', move: 'movement', hp: 10, speed: 1.3, melee: true, dmg: 9, range: 1.0, cd: 1.3, size: 1.0, growl: 'dreameater', score: 260, atkFps: 10, hitAt: 0.5, ai: 'dreameater', float: true, tip: 'ÄTER LJUS – DÖDA DEN INNAN LAMPAN SLOCKNAR' },
  'Ư': { name: 'SPEGLING', sheet: 'shadowtwin', move: 'movement', hp: 10, speed: 1.4, melee: false, dmg: 7, range: 10, cd: 99, size: 1.05, growl: 'doppelganger', score: 300, atkFps: 10, hitAt: 0.5, ai: 'doppelganger', tip: 'SKJUTER NÄR DU SKJUTER – SIKTA NOGA' },
  'ư': { name: 'SÖMNGÅNGARE', sheet: 'sleepwalker', move: 'movement', hp: 16, speed: 0.6, melee: true, dmg: 13, range: 1.0, cd: 1.5, size: 1.05, growl: 'sleepwalker', score: 220, atkFps: 9, hitAt: 0.6, ai: 'sleepwalker', tip: 'GÅR INTE ATT SMYGA FÖRBI – OCH SPRICKER I SÖMNPULVER' },
  // version 17: Spökskeppet och Laboratoriet
  'Ǖ': { name: 'SPÖKPIRAT', sheet: 'ghostpirate', move: 'movement', hp: 11, speed: 1.5, melee: true, dmg: 11, range: 1.05, cd: 1.0, size: 1.1, growl: 'ghostpirate', score: 240, atkFps: 12, hitAt: 0.5, ai: 'ghostpirate', tip: 'BLIR IMMUN EN STUND NÄR DEN TRÄFFAS – VÄNTA UT DIMMAN' },
  'ǖ': { name: 'KANONJÄR', sheet: 'gunner', move: 'movement', hp: 12, speed: 0.8, melee: false, dmg: 14, range: 12, cd: 99, size: 1.15, growl: 'gunner', growlVol: 0.8, score: 280, atkFps: 10, hitAt: 0.5, ai: 'gunner', tip: 'KANONKULAN LANDAR DÄR RINGEN LYSER – SPRING' },
  'Ǘ': { name: 'DRUNKNAD MATROS', sheet: 'drownedsailor', move: 'movement', hp: 20, speed: 0.75, melee: true, dmg: 12, range: 1.05, cd: 1.4, size: 1.1, growl: 'drownedsailor', score: 260, atkFps: 10, hitAt: 0.55, ai: 'drownedsailor', tip: 'TRÄFFEN SAKTAR NED – HÅLL AVSTÅND' },
  'ǘ': { name: 'PAPEGOJSPÖKE', sheet: 'ghostparrot', move: 'movement', hp: 4, speed: 2.6, melee: true, dmg: 5, range: 0.8, cd: 99, size: 0.8, growl: 'ghostparrot', growlVol: 0.25, score: 150, atkFps: 14, hitAt: 0.5, ai: 'ghostparrot', float: true, tip: 'STJÄL GULD – DÖDA DEN FÖR ATT FÅ TILLBAKA DET' },
  'Ǚ': { name: 'TENTAKEL', sheet: 'tentacle', move: 'movement', hp: 18, speed: 0, melee: true, dmg: 14, range: 2.2, cd: 99, size: 1.2, growl: 'tentacle', score: 300, atkFps: 10, hitAt: 0.6, ai: 'tentacle', tip: 'SLÅR ÖVER HELA RINGEN – SPRING UR DEN ELLER HOPPA' },
  'ǚ': { name: 'SKEPPSRÅTTA', sheet: 'rat', move: 'movement', hp: 1.5, speed: 3.0, melee: true, dmg: 3, range: 0.7, cd: 0.6, size: 0.6, growl: 'rat', growlVol: 0.15, score: 30, atkFps: 14, hitAt: 0.5, ai: 'rat', tip: 'KOMMER I FLOCK – HAGEL OCH ELD' },
  'ǣ': { name: 'HOMUNKULUS', sheet: 'homunculus', move: 'movement', hp: 6, speed: 2.4, melee: true, dmg: 7, range: 0.85, cd: 0.8, size: 0.8, growl: 'homunculus', growlVol: 0.3, score: 140, atkFps: 14, hitAt: 0.5, ai: 'homunculus', tip: 'DELAR SIG I TVÅ NÄR DEN DÖR' },
  'Ǥ': { name: 'SLEM', sheet: 'ooze', move: 'movement', hp: 16, speed: 0.6, melee: true, dmg: 9, range: 0.95, cd: 1.3, size: 0.9, growl: 'ooze', growlVol: 0.75, score: 220, atkFps: 10, hitAt: 0.55, ai: 'ooze', tip: 'KULOR BITER DÅLIGT, ELD BITER BRA – AKTA SYRAN DET LÄMNAR' },
  'ǥ': { name: 'LÄRLING', sheet: 'apprentice', move: 'movement', hp: 8, speed: 1.1, melee: false, dmg: 6, range: 10, cd: 99, size: 1.0, growl: 'apprentice', score: 260, atkFps: 10, hitAt: 0.5, ai: 'apprentice', kite: 5, tip: 'KASTAR FLASKOR – SPRING UR RINGEN' },
  'Ǧ': { name: 'KVICKSILVERGOLEM', sheet: 'mercurygolem', move: 'movement', hp: 26, speed: 0.85, melee: true, dmg: 16, range: 1.3, cd: 1.5, size: 1.3, growl: 'mercurygolem', score: 460, atkFps: 9, hitAt: 0.6, ai: 'mercurygolem', tip: 'RESER SIG IGEN – DÖDA DEN MED ELD ELLER SPRÄNGMEDEL' },
  'ǧ': { name: 'FLASKGAST', sheet: 'vialwisp', move: 'movement', hp: 3, speed: 2.4, melee: true, dmg: 10, range: 0.9, cd: 99, size: 0.8, growl: 'vialwisp', score: 120, atkFps: 12, hitAt: 0.5, ai: 'vialwisp', float: true, tip: 'EXPLODERAR VID KONTAKT – SKJUT DEN PÅ AVSTÅND' },
  // version 18: Cirkusen och Djungeltemplet
  'Ƿ': { name: 'CLOWN', sheet: 'clown', move: 'movement', hp: 10, speed: 1.4, melee: true, dmg: 9, range: 1.0, cd: 1.1, size: 1.0, growl: 'clown', growlVol: 0.22, score: 200, atkFps: 12, hitAt: 0.5, ai: 'clown', tip: 'SLÄPPER BALLONGER NÄR DEN DÖR – SKJUT DEM INNAN DE NÅR DIG' },
  'Ǹ': { name: 'JONGLÖR', sheet: 'juggler', move: 'movement', hp: 9, speed: 1.0, melee: false, dmg: 7, range: 10, cd: 99, size: 1.0, growl: 'juggler', score: 240, atkFps: 10, hitAt: 0.5, ai: 'juggler', kite: 5, tip: 'KÄGLORNA STUDSAR EN GÅNG – SE UPP FÖR RETURER' },
  'ǹ': { name: 'STYLTGÅNGARE', sheet: 'stiltwalker', move: 'movement', hp: 24, speed: 0.7, melee: true, dmg: 16, range: 1.5, cd: 1.6, size: 1.35, growl: 'stiltwalker', growlVol: 0.9, score: 380, atkFps: 9, hitAt: 0.6, ai: 'stiltwalker', tip: 'SKJUT BENEN PÅ NÄRA HÅLL – DEN FALLER OMKULL' },
  'Ǻ': { name: 'KNIVKASTARE', sheet: 'knifethrower', move: 'movement', hp: 9, speed: 1.2, melee: false, dmg: 5, range: 11, cd: 99, size: 1.0, growl: 'knifethrower', score: 260, atkFps: 10, hitAt: 0.5, ai: 'knifethrower', kite: 6, tip: 'TRE KNIVAR I SOLFJÄDER – GÅ IN MELLAN DEM ELLER IN BAKOM ETT HÖRN' },
  'ǻ': { name: 'CIRKUSLEJON', sheet: 'lion', move: 'movement', hp: 18, speed: 2.0, melee: true, dmg: 13, range: 1.1, cd: 1.0, size: 1.3, growl: 'lion', growlVol: 0.25, score: 340, atkFps: 12, hitAt: 0.5, ai: 'lion', tip: 'SPRÅNGET ÄR LÅNGT – SIDSTEG NÄR DET TAR SATS' },
  'Ǽ': { name: 'MARIONETT', sheet: 'marionette', move: 'movement', hp: 10, speed: 1.1, melee: true, dmg: 9, range: 1.0, cd: 1.2, size: 1.05, growl: 'marionette', score: 220, atkFps: 10, hitAt: 0.5, ai: 'marionette', tip: 'RESER SIG EN GÅNG – SKJUT DEN MEDAN DEN LIGGER' },
  'Ȉ': { name: 'ÖDLEKRIGARE', sheet: 'lizardman', move: 'movement', hp: 16, speed: 1.2, melee: true, dmg: 8, range: 1.3, cd: 1.3, size: 1.1, growl: 'lizardman', growlVol: 0.75, score: 280, atkFps: 10, hitAt: 0.55, ai: 'lizardman', tip: 'SKÖLDEN TAR HALVA SKADAN FRAMIFRÅN – ANFALL FRÅN SIDAN' },
  'ȉ': { name: 'BLÅSRÖRSJÄGARE', sheet: 'blowgunner', move: 'movement', hp: 7, speed: 1.1, melee: false, dmg: 5, range: 11, cd: 99, size: 0.95, growl: 'blowgunner', growlVol: 0.4, score: 260, atkFps: 10, hitAt: 0.5, ai: 'blowgunner', kite: 5, tip: 'SYNS BARA NÄR DEN SKJUTER – LYSSNA EFTER PILEN' },
  'Ȋ': { name: 'APA', sheet: 'monkey', move: 'movement', hp: 6, speed: 2.4, melee: true, dmg: 4, range: 0.85, cd: 1.0, size: 0.7, growl: 'monkey', growlVol: 0.2, score: 160, atkFps: 14, hitAt: 0.5, ai: 'monkey', tip: 'STJÄL AMMO OCH FLYR – DÖDA DEN SÅ FÅR DU TILLBAKA DUBBELT' },
  'ȋ': { name: 'JAGUAR', sheet: 'jaguar', move: 'movement', hp: 17, speed: 2.1, melee: true, dmg: 14, range: 1.1, cd: 1.0, size: 1.2, growl: 'jaguar', score: 360, atkFps: 12, hitAt: 0.5, ai: 'jaguar', tip: 'OSYNLIG PÅ AVSTÅND – HÅLL RYGGEN MOT EN VÄGG' },
  'Ȍ': { name: 'MYGGSVÄRM', sheet: 'mosquito', move: 'movement', hp: 2.5, speed: 2.3, melee: true, dmg: 2, range: 0.8, cd: 0.9, size: 0.5, growl: 'mosquito', growlVol: 0.08, score: 50, atkFps: 14, hitAt: 0.5, ai: 'mosquito', float: true, tip: 'SUGER BLOD OCH LÄKER SIG – HAGEL OCH ELD' },
  'ȍ': { name: 'TEMPELVÄKTARE', sheet: 'templeguardian', move: 'movement', hp: 24, speed: 0, melee: false, dmg: 18, range: 9, cd: 99, size: 1.25, growl: 'templeguardian', score: 480, atkFps: 8, hitAt: 0.6, ai: 'templeguardian', stone: true, tip: 'STÅR STILL TILLS DU KOMMER NÄRA – GÅ UR STRÅLEN NÄR ÖGONEN GLÖDER' },
  // version 19: Gruvan och Observatoriet
  'ȡ': { name: 'GRUVARBETARE', sheet: 'miner', move: 'movement', hp: 12, speed: 1.2, melee: true, dmg: 10, range: 1.1, cd: 1.2, size: 1.0, growl: 'miner', growlVol: 0.5, score: 240, atkFps: 10, hitAt: 0.55, ai: 'miner', tip: 'KASTAR DYNAMIT – SPRING UR RINGEN' },
  'Ȣ': { name: 'KOLGOLEM', sheet: 'coalgolem', move: 'movement', hp: 30, speed: 0.75, melee: true, dmg: 15, range: 1.4, cd: 1.6, size: 1.35, growl: 'coalgolem', growlVol: 0.7, score: 460, atkFps: 9, hitAt: 0.6, ai: 'coalgolem', fireproof: true, tip: 'STARKARE I ELD – OCH EXPLODERAR I GLÖD NÄR DEN DÖR' },
  'ȣ': { name: 'MULLVADSMAN', sheet: 'moleman', move: 'movement', hp: 11, speed: 2.6, melee: true, dmg: 10, range: 1.0, cd: 1.0, size: 0.95, growl: 'moleman', growlVol: 0.45, score: 260, atkFps: 12, hitAt: 0.5, ai: 'moleman', tip: 'GRÄVER NED SIG OCH KOMMER UPP BREDVID DIG' },
  'Ȥ': { name: 'GNISTLYKTA', sheet: 'sparkwisp', move: 'movement', hp: 3, speed: 2.2, melee: true, dmg: 8, range: 0.9, cd: 99, size: 0.45, growl: 'sparkwisp', growlVol: 0.3, score: 120, atkFps: 12, hitAt: 0.5, ai: 'sparkwisp', float: true, tip: 'TÄNDER GASEN OCH EXPLODERAR – SKJUT DEN PÅ AVSTÅND' },
  'ȥ': { name: 'STJÄRNFÖDD', sheet: 'starspawn', move: 'movement', hp: 8, speed: 1.3, melee: false, dmg: 6, range: 10, cd: 99, size: 0.6, growl: 'starspawn', growlVol: 0.25, score: 240, atkFps: 10, hitAt: 0.5, ai: 'starspawn', float: true, kite: 5, tip: 'STJÄRNSKOTTEN DELAR SIG I TRE' },
  'Ȧ': { name: 'ASTRONOM', sheet: 'astronomer', move: 'movement', hp: 9, speed: 1.0, melee: false, dmg: 12, range: 11, cd: 99, size: 1.0, growl: 'astronomer', growlVol: 0.5, score: 280, atkFps: 10, hitAt: 0.5, ai: 'astronomer', kite: 6, tip: 'KALLAR NED METEORER DÄR DU STÅR – RÖR DIG' },
  'ȧ': { name: 'URVERKSUGGLA', sheet: 'clockowl', move: 'movement', hp: 7, speed: 2.4, melee: true, dmg: 8, range: 1.0, cd: 1.0, size: 0.6, growl: 'clockowl', growlVol: 0.35, score: 220, atkFps: 12, hitAt: 0.5, ai: 'clockowl', float: true, tip: 'DYKER – OCH REFLEKTERAR IBLAND ETT SKOTT' },
  'Ȩ': { name: 'TOMRUMSVÄKTARE', sheet: 'voidwatcher', move: 'movement', hp: 26, speed: 0.7, melee: false, dmg: 8, range: 9, cd: 99, size: 1.0, growl: 'voidwatcher', growlVol: 0.5, score: 460, atkFps: 9, hitAt: 0.6, ai: 'voidwatcher', float: true, tip: 'STJÄRNKYLAN GÖR DIG LÅNGSAM – GÅ UR STRÅLEN' },
  // version 20: Kloakerna och Öknen
  'ȼ': { name: 'ALLIGATOR', sheet: 'alligator', move: 'movement', hp: 26, speed: 1.0, melee: true, dmg: 16, range: 1.3, cd: 1.4, size: 1.1, growl: 'alligator', growlVol: 0.6, score: 420, atkFps: 10, hitAt: 0.55, ai: 'alligator', tip: 'LIGGER GÖMD I SLAMMET – HÅLL AVSTÅND TILL KANALERNA' },
  'Ƚ': { name: 'SLAMVARELSE', sheet: 'sludgeman', move: 'movement', hp: 18, speed: 0.7, melee: false, dmg: 10, range: 9, cd: 99, size: 1.05, growl: 'sludgeman', growlVol: 0.8, score: 300, atkFps: 9, hitAt: 0.55, ai: 'sludgeman', kite: 5, tip: 'SLAMKLUMPARNA LÄMNAR SLAM – SPRING UR RINGEN' },
  'Ⱦ': { name: 'RÖRMOKARE', sheet: 'plumber', move: 'movement', hp: 24, speed: 1.1, melee: true, dmg: 13, range: 1.2, cd: 1.3, size: 1.0, growl: 'plumber', growlVol: 0.8, score: 320, atkFps: 10, hitAt: 0.55, ai: 'plumber', tip: 'TÅLIG – OCH SNABBARE NÄR DEN ÄR SKADAD' },
  'ȿ': { name: 'IGEL', sheet: 'leech', move: 'movement', hp: 3, speed: 2.0, melee: true, dmg: 2, range: 0.8, cd: 99, size: 0.45, growl: 'leech', growlVol: 0.4, score: 90, atkFps: 12, hitAt: 0.5, ai: 'leech', tip: 'FÄSTER SIG – SKJUT DEN ELLER HOPPA TRE GÅNGER' },
  'ɀ': { name: 'SKORPION', sheet: 'scorpion', move: 'movement', hp: 9, speed: 2.5, melee: true, dmg: 9, range: 1.0, cd: 0.9, size: 0.8, growl: 'scorpion', growlVol: 0.7, score: 200, atkFps: 12, hitAt: 0.5, ai: 'scorpion', tip: 'SVANSHUGGET FÖRGIFTAR' },
  'Ɂ': { name: 'NOMAD', sheet: 'nomad', move: 'movement', hp: 14, speed: 1.6, melee: true, dmg: 12, range: 1.1, cd: 1.0, size: 1.0, growl: 'nomad', growlVol: 0.5, score: 280, atkFps: 11, hitAt: 0.5, ai: 'nomad', tip: 'KLIVER UNDAN NÄR DU SIKTAR – HAGEL ELLER NÄRSTRID' },
  'ɂ': { name: 'SANDVÅLNAD', sheet: 'sandwraith', move: 'movement', hp: 12, speed: 1.4, melee: true, dmg: 3, range: 1.6, cd: 99, size: 0.9, growl: 'sandwraith', growlVol: 0.4, score: 300, atkFps: 10, hitAt: 0.5, ai: 'sandwraith', float: true, tip: 'NÄSTAN OSYNLIG I SANDSTORMEN – SLITER PÅ DIG I NÄRHETEN' },
  'Ƀ': { name: 'GAM', sheet: 'vulture', move: 'movement', hp: 8, speed: 2.6, melee: true, dmg: 9, range: 1.0, cd: 1.2, size: 0.8, growl: 'vulture', growlVol: 0.35, score: 200, atkFps: 12, hitAt: 0.5, ai: 'vulture', float: true, tip: 'CIRKLAR TILLS DU ÄR SKADAD – DYKER SEDAN' },
  // version 21: Järnfängelset och Fiskeläget
  'ɕ': { name: 'NYCKELKNEKT', sheet: 'turnkey', move: 'movement', hp: 15, speed: 1.3, melee: true, dmg: 11, range: 1.1, cd: 1.1, size: 1.0, growl: 'turnkey', growlVol: 0.95, score: 260, atkFps: 10, hitAt: 0.5, ai: 'turnkey', tip: 'BLÅSER I VISSELPIPAN NÄR DEN SER DIG – DÖDA DEN FÖRST' },
  'ɖ': { name: 'KEDJEFÅNGE', sheet: 'convict', move: 'movement', hp: 22, speed: 0.8, melee: true, dmg: 14, range: 2.0, cd: 1.6, size: 1.05, growl: 'convict', growlVol: 0.7, score: 300, atkFps: 9, hitAt: 0.6, ai: 'convict', tip: 'KULAN SVEPER I EN BRED BÅGE – HÅLL TRE RUTOR AVSTÅND' },
  'ɗ': { name: 'TORTYRMÄSTARE', sheet: 'torturer', move: 'movement', hp: 20, speed: 0.9, melee: false, dmg: 10, range: 9, cd: 99, size: 1.05, growl: 'torturer', growlVol: 0.7, score: 340, atkFps: 9, hitAt: 0.55, ai: 'torturer', kite: 5, tip: 'KASTAR GLÖDANDE JÄRN SOM SÄTTER DIG I BRAND' },
  'ɘ': { name: 'VAKTHUND', sheet: 'watchdog', move: 'movement', hp: 8, speed: 2.8, melee: true, dmg: 7, range: 0.9, cd: 0.8, size: 0.7, growl: 'watchdog', growlVol: 0.6, score: 160, atkFps: 12, hitAt: 0.5, ai: 'watchdog', tip: 'SNABBA OCH KOMMER I PAR – HAGEL' },
  'ə': { name: 'DRUNKNAD FISKARE', sheet: 'drownedfisher', move: 'movement', hp: 18, speed: 0.9, melee: true, dmg: 12, range: 2.0, cd: 1.4, size: 1.0, growl: 'drowned', growlVol: 0.6, score: 280, atkFps: 10, hitAt: 0.55, ai: 'drownedfisher', tip: 'HARPUNEN NÅR TVÅ RUTOR – GÅ IN NÄRA ELLER HÅLL AVSTÅND' },
  'ɚ': { name: 'FISKMAN', sheet: 'fishman', move: 'movement', hp: 16, speed: 1.6, melee: true, dmg: 12, range: 1.1, cd: 1.1, size: 1.0, growl: 'fishman', growlVol: 0.7, score: 300, atkFps: 11, hitAt: 0.5, ai: 'fishman', tip: 'HOPPAR UPP UR DJUPVATTNET – HÅLL DIG BORTA FRÅN BRYGGKANTEN' },
  'ɛ': { name: 'STRANDKRABBA', sheet: 'shorecrab', move: 'movement', hp: 20, speed: 1.1, melee: true, dmg: 10, range: 1.1, cd: 1.2, size: 0.9, growl: 'shorecrab', growlVol: 0.95, score: 280, atkFps: 10, hitAt: 0.5, ai: 'shorecrab', tip: 'PANSAR FRAMTILL – ANFALL FRÅN SIDAN ELLER SPRÄNG DEN' },
  'ɜ': { name: 'MÅSSVÄRM', sheet: 'gulls', move: 'movement', hp: 4, speed: 2.4, melee: true, dmg: 4, range: 1.0, cd: 1.0, size: 0.6, growl: 'gulls', growlVol: 0.35, score: 90, atkFps: 12, hitAt: 0.5, ai: 'gulls', float: true, tip: 'DYKER OCH HACKAR – KOMMER I FLOCK' },
  // version 22: Badhuset och Skärselden
  'ɩ': { name: 'BADVAKT', sheet: 'attendant', move: 'movement', hp: 14, speed: 1.0, melee: true, dmg: 9, range: 1.3, cd: 1.2, size: 1.0, growl: 'attendant', growlVol: 0.8, score: 240, atkFps: 10, hitAt: 0.5, ai: 'attendant', tip: 'HANDDUKSSNÄRTEN SAKTAR DIG EN SEKUND' },
  'ɪ': { name: 'ÅNGVÅLNAD', sheet: 'steamghost', move: 'movement', hp: 12, speed: 1.3, melee: true, dmg: 3, range: 1.6, cd: 99, size: 0.95, growl: 'steamghost', growlVol: 0.5, score: 300, atkFps: 10, hitAt: 0.5, ai: 'steamghost', float: true, tip: 'SYNS BARA I ÅNGAN OCH NÄRA – SLITER PÅ DIG' },
  'ɫ': { name: 'GLADIATOR', sheet: 'gladiator', move: 'movement', hp: 22, speed: 1.1, melee: true, dmg: 13, range: 1.6, cd: 1.3, size: 1.05, growl: 'gladiator', growlVol: 0.8, score: 360, atkFps: 10, hitAt: 0.55, ai: 'gladiator', tip: 'SKÖLDEN TAR SKOTT FRAMIFRÅN – NÄTET SNÄRJER – ANFALL FRÅN SIDAN' },
  'ɬ': { name: 'MÖGELKRYPARE', sheet: 'moldcrawler', move: 'movement', hp: 9, speed: 1.2, melee: true, dmg: 7, range: 0.9, cd: 1.0, size: 0.75, growl: 'moldcrawler', growlVol: 0.7, score: 180, atkFps: 10, hitAt: 0.5, ai: 'moldcrawler', tip: 'LÄMNAR GIFTIGA SPORER DÄR DEN DÖR – DÖDA DEN PÅ AVSTÅND' },
  'ɵ': { name: 'ELDIMP', sheet: 'fireimp', move: 'movement', hp: 9, speed: 2.2, melee: false, dmg: 8, range: 9, cd: 99, size: 0.8, growl: 'fireimp', growlVol: 0.7, score: 220, atkFps: 12, hitAt: 0.5, ai: 'fireimp', kite: 5, tip: 'SNABB OCH KASTAR ELDKLOT – HÅLL DIG I RÖRELSE' },
  'ɶ': { name: 'PLÅGAD SJÄL', sheet: 'lostsoul', move: 'movement', hp: 6, speed: 1.8, melee: true, dmg: 12, range: 0.9, cd: 99, size: 0.7, growl: 'lostsoul', growlVol: 0.6, score: 200, atkFps: 12, hitAt: 0.5, ai: 'lostsoul', float: true, tip: 'STÖRTAR MOT DIG OCH EXPLODERAR – SKJUT DEN I LUFTEN' },
  'ɷ': { name: 'KÖTTBJÄSSE', sheet: 'fleshbrute', move: 'movement', hp: 46, speed: 0.8, melee: true, dmg: 18, range: 1.5, cd: 1.6, size: 1.45, growl: 'fleshbrute', growlVol: 0.9, score: 560, atkFps: 9, hitAt: 0.6, ai: 'fleshbrute', tip: 'RUSAR OCH SLÅR I MARKEN – HOPPA ÖVER CHOCKVÅGEN' },
  'ɸ': { name: 'ASKVANDRARE', sheet: 'ashwalker', move: 'movement', hp: 18, speed: 0.75, melee: true, dmg: 12, range: 1.2, cd: 1.4, size: 1.05, growl: 'ashwalker', growlVol: 0.7, score: 300, atkFps: 9, hitAt: 0.55, ai: 'ashwalker', tip: 'RESER SIG UR ASKAN EN GÅNG – SPRÄNG ELLER BRÄNN DEN' },
  // version 23: Slakteriet och Slagfältet
  'ʄ': { name: 'SLAKTARE', sheet: 'butcher', move: 'movement', hp: 24, speed: 1.0, melee: true, dmg: 13, range: 1.3, cd: 1.3, size: 1.1, growl: 'butcher', growlVol: 0.85, score: 340, atkFps: 10, hitAt: 0.55, ai: 'butcher', tip: 'KASTAR KÖTTYXOR PÅ AVSTÅND – GÅ NÄRA ELLER TA SKYDD' },
  'ʅ': { name: 'GRISMAN', sheet: 'pigman', move: 'movement', hp: 20, speed: 1.2, melee: true, dmg: 11, range: 1.1, cd: 1.2, size: 1.05, growl: 'pigman', growlVol: 0.85, score: 280, atkFps: 11, hitAt: 0.5, ai: 'pigman', tip: 'RUSAR OCH KNUFFAR – KLIV ÅT SIDAN, DÅ SLÅR DEN I VÄGGEN' },
  'ʆ': { name: 'FLUGSVÄRM', sheet: 'flies', move: 'movement', hp: 3, speed: 2.0, melee: true, dmg: 3, range: 0.9, cd: 0.9, size: 0.55, growl: 'flies', growlVol: 0.3, score: 60, atkFps: 12, hitAt: 0.5, ai: 'flies', float: true, tip: 'SVAG MEN KOMMER I MOLN – DRAS TILL LIKEN' },
  'ʇ': { name: 'STYCKAD', sheet: 'crawler', move: 'movement', hp: 10, speed: 2.1, melee: true, dmg: 8, range: 0.9, cd: 0.9, size: 0.7, growl: 'crawler', growlVol: 0.7, score: 200, atkFps: 12, hitAt: 0.5, ai: 'crawler', tip: 'KRYPER SNABBT LÄNGS GOLVET – SIKTA LÅGT' },
  'ʐ': { name: 'SPÖKSOLDAT', sheet: 'ghostsoldier', move: 'movement', hp: 18, speed: 1.0, melee: true, dmg: 11, range: 1.3, cd: 1.3, size: 1.0, growl: 'ghostsoldier', growlVol: 0.7, score: 300, atkFps: 10, hitAt: 0.5, ai: 'ghostsoldier', tip: 'SKÖLDEN TAR SKOTT FRAMIFRÅN – BRYT FORMATIONEN' },
  'ʑ': { name: 'SPÖKBÅGSKYTT', sheet: 'ghostarcher', move: 'movement', hp: 12, speed: 1.0, melee: false, dmg: 6, range: 10, cd: 99, size: 1.0, growl: 'ghostarcher', growlVol: 0.7, score: 280, atkFps: 10, hitAt: 0.5, ai: 'ghostarcher', kite: 5, tip: 'SKJUTER PILSKURAR OM TRE – SPRING I SIDLED' },
  'ʒ': { name: 'SPÖKRYTTARE', sheet: 'ghostrider', move: 'movement', hp: 34, speed: 1.3, melee: true, dmg: 16, range: 1.3, cd: 1.5, size: 1.35, growl: 'ghostrider', growlVol: 0.9, score: 520, atkFps: 10, hitAt: 0.5, ai: 'ghostrider', tip: 'RUSAR I LÅNGA RAKA LINJER – KLIV UR VÄGEN' },
  // version 30 (SPEL): Ruinstaden och Glasbruket
  'ʨ': { name: 'PLUNDRARE', sheet: 'looter', move: 'movement', hp: 14, speed: 1.5, melee: true, dmg: 9, range: 1.1, cd: 1.0, size: 1.0, growl: 'looter', growlVol: 0.7, score: 240, atkFps: 11, hitAt: 0.5, ai: 'looter', tip: 'KASTAR KNIVAR OCH FLYR NÄR DEN ÄR SKADAD – SKJUT INNAN DEN SMITER' },
  'ʩ': { name: 'STENGOLEM', sheet: 'rubblegolem', move: 'movement', hp: 60, speed: 0.6, melee: true, dmg: 20, range: 1.5, cd: 1.8, size: 1.5, growl: 'rubblegolem', growlVol: 0.9, score: 620, atkFps: 8, hitAt: 0.6, ai: 'rubblegolem', tip: 'KASTAR STENBLOCK I BÅGE – GÅ NÄRA OCH HÅLL DIG I RÖRELSE' },
  'ʪ': { name: 'TAKSKYTT', sheet: 'rooftopper', move: 'movement', hp: 12, speed: 1.0, melee: false, dmg: 9, range: 12, cd: 99, size: 1.0, growl: 'rooftopper', growlVol: 0.7, score: 280, atkFps: 10, hitAt: 0.5, ai: 'rooftopper', kite: 7, tip: 'ARMBORST PÅ AVSTÅND – BYTER PLATS EFTER NÅGRA SKOTT' },
  'ʫ': { name: 'DAMMVIRVEL', sheet: 'dustdevil', move: 'movement', hp: 8, speed: 1.4, melee: true, dmg: 4, range: 1.0, cd: 0.8, size: 1.0, growl: 'dustdevil', growlVol: 0.5, score: 140, atkFps: 12, hitAt: 0.5, ai: 'dustdevil', float: true, tip: 'DRAR DIG MOT SIG OCH TJOCKNAR DAMMET – SVAG, SKJUT DEN' },
  'ʮ': { name: 'GLASBLÅSARE', sheet: 'glassblower', move: 'movement', hp: 16, speed: 0.9, melee: false, dmg: 8, range: 9, cd: 99, size: 1.0, growl: 'glassblower', growlVol: 0.7, score: 300, atkFps: 10, hitAt: 0.5, ai: 'glassblower', kite: 5, tip: 'BLÅSER GLASBUBBLOR SOM SPRICKER TILL SKÄRVOR – KLIV UNDAN' },
  'ʯ': { name: 'GLASGOLEM', sheet: 'glassgolem', move: 'movement', hp: 40, speed: 0.8, melee: true, dmg: 16, range: 1.4, cd: 1.5, size: 1.35, growl: 'glassgolem', growlVol: 0.85, score: 520, atkFps: 9, hitAt: 0.55, ai: 'glassgolem', tip: 'SKOTT STUDSAR AV – SPRÄNG ELLER SLÅ DEN' },
  'ʰ': { name: 'SLAGGKRYPARE', sheet: 'slagcrawler', move: 'movement', hp: 10, speed: 2.0, melee: true, dmg: 7, range: 0.9, cd: 0.9, size: 0.75, growl: 'slagcrawler', growlVol: 0.6, score: 200, atkFps: 12, hitAt: 0.5, ai: 'slagcrawler', tip: 'LÄMNAR SMÄLT GLAS EFTER SIG – SKJUT DEN INNAN DEN NÅR DIG' },
  'ʱ': { name: 'UGNSANDE', sheet: 'kilnspirit', move: 'movement', hp: 7, speed: 1.8, melee: true, dmg: 10, range: 0.9, cd: 99, size: 0.7, growl: 'kilnspirit', growlVol: 0.6, score: 200, atkFps: 12, hitAt: 0.5, ai: 'kilnspirit', float: true, tip: 'STÖRTAR MOT DIG OCH EXPLODERAR – SKJUT DEN I LUFTEN' },
  'ʓ': { name: 'KRÅKOR', sheet: 'crows', move: 'movement', hp: 4, speed: 2.4, melee: true, dmg: 4, range: 1.0, cd: 1.0, size: 0.6, growl: 'crows', growlVol: 0.4, score: 90, atkFps: 12, hitAt: 0.5, ai: 'crows', float: true, tip: 'FLOCKEN DYKER – SKJUT DEN NÄR DEN KOMMER' },
  'Ǩ': { name: 'KIMÄR', sheet: 'chimera', move: 'movement', hp: 34, speed: 1.1, melee: true, dmg: 16, range: 1.4, cd: 1.4, size: 1.4, growl: 'chimera', score: 520, atkFps: 10, hitAt: 0.55, ai: 'chimera', tip: 'BETT, ELD OCH GIFT I TUR OCH ORDNING – LÄR DIG RYTMEN' },
  'Ƒ': { name: 'KORGOSSE', sheet: 'choirboy', move: 'movement', hp: 6, speed: 1.0, melee: false, dmg: 5, range: 9, cd: 2.6, size: 0.85, growl: 'choirboy', score: 220, atkFps: 10, hitAt: 0.5, ai: 'choirboy', kite: 6, tip: 'LÄKER OCH SKYDDAR DE ANDRA – DÖDA HONOM FÖRST' },
  'ƒ': { name: 'BOTGÖRARE', sheet: 'flagellant', move: 'movement', hp: 14, speed: 1.4, melee: true, dmg: 12, range: 1.0, cd: 1.0, size: 1.05, growl: 'flagellant', score: 260, atkFps: 11, hitAt: 0.5, ai: 'flagellant', tip: 'BLIR FARLIGARE JU MER SKADAD DEN ÄR – DÖDA DEN SNABBT' },
  'Ɯ': { name: 'KERUB', sheet: 'cherub', move: 'movement', hp: 5, speed: 1.8, melee: false, dmg: 6, range: 8, cd: 99, size: 0.65, growl: 'cherub', score: 180, atkFps: 12, hitAt: 0.5, ai: 'cherub', float: true, kite: 4, tip: 'SKRIKET FÅR SIKTET ATT HOPPA – SKJUT DEN FÖRST' },
  'Ƙ': { name: 'ARBETSBI', sheet: 'workerbee', move: 'movement', hp: 2, speed: 2.8, melee: true, dmg: 4, range: 0.7, cd: 0.7, size: 0.5, growl: 'workerbee', score: 40, atkFps: 14, hitAt: 0.5, ai: 'workerbee', float: true, tip: 'KOMMER I SVÄRM – HAGEL OCH ELD' },
  'ƙ': { name: 'GADDKRIGARE', sheet: 'stingerknight', move: 'movement', hp: 18, speed: 1.3, melee: true, dmg: 14, range: 1.1, cd: 1.3, size: 1.2, growl: 'stingerknight', score: 380, atkFps: 10, hitAt: 0.55, ai: 'stingerknight', float: true, tip: 'RUSAR MED GADDEN – SIDSTEG NÄR DEN TAR SATS' },
  'ƚ': { name: 'LARV', sheet: 'larva', move: 'movement', hp: 6, speed: 0.6, melee: false, dmg: 6, range: 8, cd: 99, size: 0.65, growl: 'larva', score: 110, atkFps: 10, hitAt: 0.5, ai: 'larva', tip: 'SPOTTAR SYRA – HÅLL DIG I RÖRELSE' },
  'Ƅ': { name: 'SNÖFANTOM', sheet: 'snowwraith', move: 'movement', hp: 9, speed: 1.6, melee: true, dmg: 10, range: 1.0, cd: 1.2, size: 0.95, growl: 'snowwraith', score: 260, atkFps: 10, hitAt: 0.5, ai: 'snowwraith', frostBite: true, float: true, tip: 'SYNS KNAPPT I SNÖN – LYSSNA EFTER YLANDET' },
  'ƅ': { name: 'LAVAORM', sheet: 'lavaworm2', move: 'movement', hp: 14, speed: 1.0, melee: false, dmg: 9, range: 9, cd: 99, size: 1.0, growl: 'lavaworm_growl', score: 320, atkFps: 10, hitAt: 0.5, ai: 'lavaworm', tip: 'DYKER I MARKEN – SKJUT NÄR DEN ÄR UPPE' },
  'Ɔ': { name: 'SKARABÉPRÄST', sheet: 'scarabpriest', move: 'movement', hp: 10, speed: 1.0, melee: false, dmg: 7, range: 10, cd: 2.8, size: 1.05, growl: 'scarabpriest', score: 300, atkFps: 10, hitAt: 0.5, ai: 'scarabpriest', kite: 5, tip: 'VÄCKER SKARABÉER – DÖDA PRÄSTEN FÖRST' },
  'Ƈ': { name: 'KRISTALLSPINDEL', sheet: 'crystalspider', move: 'movement', hp: 7, speed: 1.8, melee: false, dmg: 6, range: 10, cd: 99, size: 0.9, growl: 'crystalspider', score: 220, atkFps: 12, hitAt: 0.5, ai: 'crystalspider', kite: 4, crystal: true, tip: 'NÄTET SAKTAR NED – HOPPA ÖVER SKOTTEN' },
  'ƈ': { name: 'MARULK', sheet: 'anglerfish', move: 'movement', hp: 16, speed: 1.6, melee: true, dmg: 12, range: 1.1, cd: 1.3, size: 1.1, growl: 'anglerfish', score: 320, atkFps: 10, hitAt: 0.5, ai: 'anglerfish', float: true, tip: 'LJUSET LOCKAR – HÅLL DIG BORTA FRÅN DJUPET' },
  'Ɖ': { name: 'VINDANDE', sheet: 'windspirit', move: 'movement', hp: 12, speed: 1.3, melee: true, dmg: 8, range: 1.0, cd: 1.4, size: 1.1, growl: 'windspirit', score: 300, atkFps: 10, hitAt: 0.5, ai: 'windspirit', float: true, tip: 'TRÄFFA DEN NÄR DEN FÄSTER SIG' },
  'Ų': { name: 'FLYGANDE BOK', sheet: 'grimoire', move: 'movement', hp: 3, speed: 2.3, melee: true, dmg: 5, range: 0.8, cd: 0.8, size: 0.55, growl: 'grimoire', score: 70, atkFps: 14, hitAt: 0.5, ai: 'grimoire', float: true, tip: 'KOMMER I FLOCK – SPRÄNGMEDEL OCH HAGEL' },
  'ų': { name: 'BLÄCKSLEM', sheet: 'inkslime', move: 'movement', hp: 10, speed: 0.9, melee: true, dmg: 8, range: 0.9, cd: 1.2, size: 0.75, growl: 'inkslime', score: 160, atkFps: 10, hitAt: 0.5, ai: 'inkslime', tip: 'DELAR SIG OCH LÄMNAR BLÄCK – HÅLL AVSTÅND' },
  'Ŵ': { name: 'ARKIVARIESPÖKE', sheet: 'archivist', move: 'movement', hp: 9, speed: 1.0, melee: false, dmg: 7, range: 10, cd: 2.6, size: 1.05, growl: 'archivist', score: 300, atkFps: 10, hitAt: 0.5, ai: 'archivist', kite: 5, proj: 'orb', tip: 'BLINKAR MELLAN HYLLORNA OCH VÄCKER BÖCKER' },
  'Ž': { name: 'SMÄLTGOLEM', sheet: 'moltengolem', move: 'movement', hp: 34, speed: 0.7, melee: true, dmg: 18, range: 1.4, cd: 1.6, size: 1.35, growl: 'moltengolem', score: 480, atkFps: 9, hitAt: 0.6, ai: 'moltengolem', tip: 'BRINNER INTE – FRYS DEN ELLER LOCKA DEN I VATTEN' },
  'ž': { name: 'ÅNGAUTOMAT', sheet: 'steambot', move: 'movement', hp: 14, speed: 1.0, melee: true, dmg: 14, range: 1.0, cd: 99, size: 1.05, growl: 'steambot', score: 300, atkFps: 10, hitAt: 0.5, ai: 'steambot', tip: 'SPRUTAR ÅNGA PÅ NÄRA HÅLL – SKJUT PÅ AVSTÅND' },
  'ſ': { name: 'GNISTDRÖNARE', sheet: 'sparkdrone', move: 'movement', hp: 4, speed: 1.6, melee: false, dmg: 6, range: 9, cd: 1.8, size: 0.55, growl: 'sparkdrone', score: 120, atkFps: 12, hitAt: 0.5, ai: 'sparkdrone', float: true, kite: 4, proj: 'bolt', tip: 'EXPLODERAR NÄR DEN DÖR – SKJUT DEN PÅ AVSTÅND' },
  'ŗ': { name: 'SPORLING', sheet: 'sporling', move: 'movement', hp: 3, speed: 1.9, melee: true, dmg: 5, range: 0.8, cd: 0.9, size: 0.6, growl: 'sporling', score: 70, atkFps: 12, hitAt: 0.5, ai: 'sporling', fungus: true, tip: 'SPRICKER I SPORER – SKJUT PÅ AVSTÅND' },
  'Ř': { name: 'MYCELBEST', sheet: 'mycelbrute', move: 'movement', hp: 30, speed: 0.75, melee: true, dmg: 17, range: 1.4, cd: 1.5, size: 1.3, growl: 'mycelbrute', score: 460, atkFps: 9, hitAt: 0.6, ai: 'mycelbrute', fungus: true, tip: 'LÄKER SIG I SPORER – LOCKA UT DEN UR MOLNEN' },
  'ř': { name: 'SVAMPSHAMAN', sheet: 'myconid', move: 'movement', hp: 9, speed: 0.95, melee: false, dmg: 7, range: 10, cd: 2.8, size: 1.0, growl: 'myconid', score: 260, atkFps: 10, hitAt: 0.5, ai: 'myconid', kite: 5, proj: 'sporeb', fungus: true, tip: 'VÄCKER SPORLINGAR – DÖDA DEN FÖRST' },
  'Ś': { name: 'SPEGELRIDDARE', sheet: 'mirrorknight', move: 'movement', hp: 16, speed: 1.0, melee: true, dmg: 13, range: 1.1, cd: 1.3, size: 1.1, growl: 'mirrorknight', score: 330, atkFps: 10, hitAt: 0.55, ai: 'mirrorknight', tip: 'SKÖLDEN STUDSAR SKOTT – ANFALL BAKIFRÅN ELLER NÄR DEN SÄNKS' },
  'ś': { name: 'ILLUSIONIST', sheet: 'illusionist', move: 'movement', hp: 8, speed: 1.1, melee: false, dmg: 7, range: 11, cd: 2.4, size: 1.05, growl: 'illusionist', score: 300, atkFps: 10, hitAt: 0.5, ai: 'illusionist', kite: 6, proj: 'illu', tip: 'KOPIORNA FÖRSVINNER VID EN TRÄFF – HITTA DEN ÄKTA' },
  'Ŝ': { name: 'GLASSKÄRVA', sheet: 'shardling', move: 'movement', hp: 3.5, speed: 2.4, melee: true, dmg: 6, range: 0.8, cd: 0.8, size: 0.6, growl: 'shardling', score: 90, atkFps: 14, hitAt: 0.5, ai: 'shardling', tip: 'SPLITTRAS I SKÄRVOR – HÅLL AVSTÅND NÄR DEN DÖR' },
  'Ō': { name: 'FÅNGVAKTARE', sheet: 'jailer', move: 'movement', hp: 11, speed: 1.15, melee: true, dmg: 12, range: 1.0, cd: 1.1, size: 1.05, growl: 'jailer', score: 240, atkFps: 11, hitAt: 0.55, ai: 'jailer', tip: 'KEDJAN BINDER DIG – HÅLL DIG BAKOM HÖRN' },
  'ō': { name: 'GRÄVARE', sheet: 'burrower', move: 'movement', hp: 8, speed: 2.6, melee: true, dmg: 11, range: 1.2, cd: 99, size: 1.15, growl: 'burrower', score: 220, atkFps: 12, hitAt: 0.5, ai: 'burrower', tip: 'JORDHÖGEN SOM RÖR SIG – HOPPA NÄR DEN KOMMER UPP' },
  'Ŏ': { name: 'LIKGRÄVARE', sheet: 'gravedigger', move: 'movement', hp: 10, speed: 1.0, melee: true, dmg: 10, range: 1.0, cd: 1.2, size: 1.05, growl: 'gravedigger', score: 260, atkFps: 10, hitAt: 0.55, ai: 'gravedigger', tip: 'VÄCKER DE DÖDA – DÖDA HONOM FÖRST' },
  'ŏ': { name: 'ROTVÄTTE', sheet: 'rootling', move: 'movement', hp: 6, speed: 1.3, melee: false, dmg: 6, range: 9, cd: 99, size: 0.9, growl: 'rootling', score: 150, atkFps: 10, hitAt: 0.5, ai: 'rootling', kite: 4, tip: 'RÖTTERNA KOMMER DÄR DU STÅR – RÖR DIG' },
  'Ő': { name: 'ARMBORSTSKYTT', sheet: 'crossbowman', move: 'movement', hp: 8, speed: 1.2, melee: false, dmg: 9, range: 14, cd: 99, size: 1.05, growl: 'crossbow_enemy', score: 230, atkFps: 10, hitAt: 0.5, ai: 'crossbowman', kite: 6, tip: 'SKJUTER LÅNGT – GÅ NÄRA' },
  'ő': { name: 'PADDJÄTTE', sheet: 'toad', move: 'movement', hp: 22, speed: 0.9, melee: true, dmg: 15, range: 1.3, cd: 1.4, size: 1.35, growl: 'toad', score: 380, atkFps: 10, hitAt: 0.55, ai: 'toad', tip: 'HOPPAR OCH SLÅR I MARKEN – HOPPA NÄR DEN LANDAR' },
  'ĳ': { name: 'URVERKSSOLDAT', sheet: 'clocksoldier', move: 'movement', hp: 10, speed: 1.15, melee: true, dmg: 11, range: 1.0, cd: 1.1, size: 1.05, growl: 'clocksoldier', score: 260, atkFps: 11, hitAt: 0.55, ai: 'clocksoldier', tip: 'LINDAS UPP IGEN EN GÅNG – SLÅ TILL MEDAN DEN LIGGER' },
  'Ĵ': { name: 'KUGGSPINDEL', sheet: 'gearspider', move: 'movement', hp: 2.5, speed: 2.5, melee: true, dmg: 5, range: 0.8, cd: 0.7, size: 0.6, growl: 'gearspider', score: 60, atkFps: 14, hitAt: 0.5, ai: 'gearspider', tip: 'KOMMER I GRUPP – SÅGBLAD OCH SPRÄNGMEDEL' },
  'ĵ': { name: 'TIDSVÄKTARE', sheet: 'timekeeper', move: 'movement', hp: 9, speed: 1.0, melee: false, dmg: 0, range: 9, cd: 99, size: 0.95, growl: 'timekeeper', score: 280, atkFps: 9, hitAt: 0.5, ai: 'timekeeper', kite: 5, tip: 'LÄGGER TIDSBUBBLOR DÄR DU STÅR – RÖR DIG' },
  'Ķ': { name: 'HARPYA', sheet: 'harpy', move: 'movement', hp: 6, speed: 2.0, melee: true, dmg: 10, range: 1.0, cd: 99, size: 0.95, growl: 'harpy', score: 210, atkFps: 12, hitAt: 0.5, ai: 'harpy', float: true, tip: 'DYKER NED – SIDSTEG NÄR DEN KOMMER' },
  'ķ': { name: 'STORMKALLARE', sheet: 'stormcaller', move: 'movement', hp: 8, speed: 1.0, melee: false, dmg: 9, range: 10, cd: 99, size: 1.05, growl: 'stormcaller', score: 290, atkFps: 10, hitAt: 0.5, ai: 'stormcaller', kite: 6, tip: 'BLIXTEN SLÅR NED DÄR MARKEN GLÖDER' },
  'ĸ': { name: 'MOLNJÄTTE', sheet: 'cloudgiant', move: 'movement', hp: 36, speed: 0.7, melee: true, dmg: 18, range: 1.4, cd: 1.6, size: 1.25, growl: 'cloudgiant', score: 500, atkFps: 9, hitAt: 0.6, ai: 'cloudgiant', tip: 'BLÅSER DIG MOT KANTEN – HÅLL DIG FRÅN TOMRUMMET' },
  'Ü': { name: 'IRRBLOSS', sheet: 'wisp', move: 'movement', hp: 3, speed: 2.2, melee: true, dmg: 0, range: 1.0, cd: 1, size: 0.8, growl: 'wisp', score: 120, atkFps: 12, hitAt: 0.5, ai: 'wisp', tip: 'SPRÄNGS I FROST – HÅLL AVSTÅND' },
  S: { name: 'SKELETT', sheet: 'skeleton1', move: 'movement', hp: 5, speed: 1.35, melee: true, dmg: 9, range: 0.95, cd: 0.9, size: 1.0, growl: 'growl', score: 100, atkFps: 14, hitAt: 0.55 },
  K: { name: 'ELDSKELETT', sheet: 'skeleton2', move: 'movemen', hp: 6, speed: 0.95, melee: false, dmg: 8, range: 8.5, cd: 1.8, size: 1.05, growl: 'hiss', score: 150, atkFps: 12, hitAt: 0.5 },
  V: { name: 'VAMPYR', sheet: 'vampire', move: 'movement', hp: 9, speed: 2.15, melee: true, dmg: 14, range: 0.95, cd: 0.75, size: 1.1, growl: 'roar', score: 250, atkFps: 16, hitAt: 0.5 },
  // nya fiender med eget beteende (ai), 64-pixelsrutor från tools/enemy-sprites/prep.py
  I: { name: 'SMÅDJÄVUL', sheet: 'imp', fw: 64, move: 'movement', hp: 4, speed: 2.5, melee: true, dmg: 8, range: 0.9, cd: 0.7, size: 1.35, growl: 'hiss', score: 150, atkFps: 14, hitAt: 0.5, ai: 'blink', tip: 'HOPPAR UNDAN VID TRÄFF' },
  L: { name: 'BLODSLEM', sheet: 'blob', fw: 64, move: 'movement', hp: 10, speed: 0.75, melee: true, dmg: 11, range: 0.95, cd: 1.1, size: 1.6, growl: 'growl', score: 150, atkFps: 12, hitAt: 0.55, ai: 'split', tip: 'DELAR SIG NÄR DEN DÖR' },
  l: { name: 'BLODDROPPE', frames: 'L', hp: 2.5, speed: 1.8, melee: true, dmg: 5, range: 0.8, cd: 0.8, size: 0.95, growl: 'growl', score: 40, atkFps: 14, hitAt: 0.5 },
  N: { name: 'BENMAGIKER', sheet: 'mage', fw: 64, move: 'movement', hp: 7, speed: 0.9, melee: false, dmg: 10, range: 9, cd: 2.4, size: 1.0, growl: 'hiss', score: 300, atkFps: 12, hitAt: 0.75, ai: 'summon', proj: 'orb', kite: 3.5, tip: 'VÄCKER DE DÖDA' },
  O: { name: 'ORKSHAMAN', sheet: 'shaman', fw: 64, move: 'movement', hp: 6, speed: 1.15, melee: false, dmg: 6, range: 7, cd: 2.0, size: 1.0, growl: 'growl', score: 300, atkFps: 12, hitAt: 0.75, ai: 'heal', proj: 'bolt', kite: 4, tip: 'HELAR – DÖDA DEN FÖRST' },
  R: { name: 'GRAVRÖVARE', sheet: 'rogue', fw: 64, move: 'movement', hp: 6, speed: 2.3, melee: true, dmg: 12, range: 0.95, cd: 0.8, size: 1.0, growl: 'hiss', score: 250, atkFps: 16, hitAt: 0.5, ai: 'stealth', tip: 'OSYNLIG PÅ AVSTÅND' },
  W: { name: 'ORKKRIGARE', sheet: 'warrior', fw: 64, move: 'movement', hp: 16, speed: 1.05, melee: true, dmg: 16, range: 1.05, cd: 1.2, size: 1.1, growl: 'roar', score: 350, atkFps: 12, hitAt: 0.5, ai: 'charge', armor: 0.6, tip: 'STORMAR – LÅT DEN KROCKA' },
};
// Bossar: en per varv i slumpad ordning. arena = vilken bossarena gen.js bygger.
const BOSSES = {
  demon: { title: 'HERRE ÖVER BENHUSEN', name: 'BENDEMONEN', hp: 320, speed: 1.0, size: 2.6, dmg: 22, range: 3.2, arena: 'hall', phaseMsg: ['BENDEMONEN KALLAR PÅ DE DÖDA', 'BENDEMONEN RASAR!'] },
  beast: { title: 'GLÖDENS FÖRSTFÖDDE', name: 'HELVETESBESTEN', hp: 300, speed: 0.6, size: 2.5, dmg: 16, range: 2.5, arena: 'cave', phaseMsg: ['BESTEN SJUNKER NED I GLÖDEN', 'MARKEN BRINNER!'] },
  nightmare: { title: 'DEN SVARTA RIDTEN', name: 'MARDRÖMMEN', hp: 280, speed: 2.0, size: 2.3, dmg: 24, range: 1.6, arena: 'graveyard', phaseMsg: ['MARDRÖMMEN STEGRAR SIG', 'MARDRÖMMEN SKENAR!'] },
  ogre: { title: 'SKOGENS SLAKTARE', name: 'OGERN', hp: 420, speed: 1.3, size: 2.6, dmg: 26, range: 3.0, arena: 'forest', phaseMsg: ['OGERN KALLAR PÅ SINA SÖNER', 'OGERN BLIR RASANDE!'] },
  frost: { title: 'VINTERNS HJÄRTA', name: 'ISDRAKEN', hp: 330, speed: 1.0, size: 2.4, dmg: 18, range: 2.2, arena: 'frost', phaseMsg: ['ISDRAKEN KALLAR PÅ STORMEN', 'ISDRAKEN BLIR KALLARE ÄN DÖDEN!'] },
  flame: { title: 'VULKANENS HJÄRTA', name: 'ELDKUNGEN', hp: 360, speed: 1.05, size: 3.0, dmg: 19, range: 2.3, arena: 'volcano', phaseMsg: ['ELDKUNGEN TÄNDER MARKEN', 'ELDKUNGEN RASAR – ALLT BRINNER!'] },
  monk: { secret: true, title: 'KRÖNIKANS SLUT', name: 'DEN FÖRSTE MUNKEN', hp: 760, speed: 1.1, size: 3.8, dmg: 18, range: 2.2, arena: 'hall', phaseMsg: ['MUNKEN BÄR KRISTALLENS ANSIKTE', 'MUNKEN KALLAR PÅ STORMEN – DET SISTA KAPITLET!'] },
  gardener: { title: 'HÄCKARNAS HERRE', name: 'TRÄDGÅRDSMÄSTAREN', hp: 470, speed: 1.0, size: 4.0, dmg: 18, range: 2.2, arena: 'garden', phaseMsg: ['TRÄDGÅRDSMÄSTAREN SLIPAR SAXEN', 'TRÄDGÅRDSMÄSTAREN RASAR – ALLT SKA BESKÄRAS!'] },
  sandman: { title: 'SÖMNENS HERRE', name: 'JON BLUND', hp: 450, speed: 1.1, size: 4.0, dmg: 16, range: 2.0, arena: 'dream', phaseMsg: ['JON BLUND STRÖR SIN SAND', 'JON BLUND RASAR – MARDRÖMMEN TAR ÖVER!'] },
  captain: { title: 'HERRE ÖVER DE DRUNKNADE', name: 'SPÖKKAPTENEN', hp: 470, speed: 1.1, size: 4.0, dmg: 17, range: 2.2, arena: 'ship', phaseMsg: ['SPÖKKAPTENEN RINGER I SKEPPSKLOCKAN', 'SPÖKKAPTENEN RASAR – ALLA MAN PÅ DÄCK!'] },
  alchemist: { title: 'DEN SOM BLANDAR LIV OCH DÖD', name: 'ALKEMISTEN', hp: 460, speed: 1.0, size: 4.2, dmg: 16, range: 2.0, arena: 'lab', phaseMsg: ['ALKEMISTEN HÖJER FLASKAN', 'ALKEMISTEN RASAR – ALLT KOKAR ÖVER!'] },
  foreman: { title: 'HERRE ÖVER SCHAKTEN', name: 'GRUVFÖRMANNEN', hp: 480, speed: 1.0, size: 4.2, dmg: 18, range: 2.4, arena: 'mine', phaseMsg: ['FÖRMANNEN BLÅSER I VISSLAN', 'FÖRMANNEN RASAR – HELA GRUVAN SKAKAR!'] },
  starseer: { title: 'DEN SOM LÄSER STJÄRNORNA', name: 'STJÄRNSKÅDAREN', hp: 470, speed: 1.1, size: 4.0, dmg: 17, range: 2.0, arena: 'observatory', phaseMsg: ['STJÄRNSKÅDAREN HÖJER TELESKOPSTAVEN', 'STJÄRNSKÅDAREN RASAR – HIMLEN FALLER!'] },
  ratking: { title: 'KLOAKERNAS HERRE', name: 'RÅTTKUNGEN', hp: 480, speed: 1.0, size: 4.0, dmg: 17, range: 2.2, arena: 'sewer', phaseMsg: ['RÅTTKUNGEN PIPER EFTER SVÄRMEN', 'RÅTTKUNGEN RASAR – HELA KLOAKEN KRYLLAR!'] },
  sphinx: { title: 'ÖKNENS VÄKTARE', name: 'SFINXEN', hp: 500, speed: 0.8, size: 4.4, dmg: 18, range: 2.4, arena: 'desert', phaseMsg: ['SFINXEN STÄLLER SIN GÅTA', 'SFINXEN RASAR – SANDEN STIGER!'] },
  executioner: { title: 'FÄNGELSETS DOMARE', name: 'BÖDELN', hp: 500, speed: 0.9, size: 4.4, dmg: 19, range: 2.4, arena: 'prison', phaseMsg: ['BÖDELN SLIPAR YXAN', 'BÖDELN RASAR – ALLA GALLER FALLER!'] },
  tidepriest: { title: 'HAVETS RÖST', name: 'TIDVATTENPRÄSTEN', hp: 480, speed: 1.0, size: 4.2, dmg: 17, range: 2.2, arena: 'harbor', phaseMsg: ['TIDVATTENPRÄSTEN HÖJER SNÄCKSTAVEN', 'TIDVATTENPRÄSTEN RASAR – HAVET STIGER!'] },
  bathmaster: { title: 'TERMERNAS HERRE', name: 'BADMÄSTAREN', hp: 500, speed: 0.85, size: 4.4, dmg: 18, range: 2.4, arena: 'bathhouse', phaseMsg: ['BADMÄSTAREN DOPPAR SKOPAN', 'BADMÄSTAREN RASAR – VATTNET KOKAR!'] },
  pyrelord: { title: 'SKÄRSELDENS FURSTE', name: 'ELDFURSTEN', hp: 540, speed: 1.0, size: 4.6, dmg: 20, range: 2.4, arena: 'purgatory', phaseMsg: ['ELDFURSTEN SPRÄNGER MARKEN', 'ELDFURSTEN RASAR – ALLT BRINNER!'] },
  butcher: { title: 'KÖTTETS HERRE', name: 'SLAKTMÄSTAREN', hp: 520, speed: 0.9, size: 4.5, dmg: 19, range: 2.4, arena: 'abattoir', phaseMsg: ['SLAKTMÄSTAREN VÄSSAR KÖTTYXAN', 'SLAKTMÄSTAREN RASAR – KVARNARNA GÅR FÖR FULLT!'] },
  warlord: { title: 'DET EVIGA SLAGETS FÄLTHERRE', name: 'KRIGSHERREN', hp: 540, speed: 1.0, size: 4.6, dmg: 20, range: 2.4, arena: 'battlefield', phaseMsg: ['KRIGSHERREN SAMLAR SINA LEDER', 'KRIGSHERREN RASAR – HELA HÄREN ANFALLER!'] },
  mayor: { title: 'DEN RASADE STADENS HERRE', name: 'BORGMÄSTAREN', hp: 520, speed: 0.85, size: 4.6, dmg: 19, range: 2.4, arena: 'ruins', phaseMsg: ['BORGMÄSTAREN SLÅR STAVEN I MARKEN', 'BORGMÄSTAREN RASAR – STADEN STÖRTAR SAMMAN!'] },
  glassmaster: { title: 'UGNARNAS MÄSTARE', name: 'GLASMÄSTAREN', hp: 500, speed: 1.0, size: 4.4, dmg: 18, range: 2.4, arena: 'glassworks', phaseMsg: ['GLASMÄSTAREN BLÅSER I PIPAN', 'GLASMÄSTAREN RASAR – UGNARNA FLAMMAR!'] },
  ringmaster: { title: 'MANEGENS HERRE', name: 'CIRKUSDIREKTÖREN', hp: 470, speed: 1.1, size: 4.0, dmg: 17, range: 2.2, arena: 'circus', phaseMsg: ['DIREKTÖREN PRESENTERAR NÄSTA NUMMER', 'DIREKTÖREN RASAR – FÖRESTÄLLNINGEN MÅSTE GÅ VIDARE!'] },
  serpent: { title: 'TEMPLETS GUD', name: 'DEN FJÄDRADE ORMEN', hp: 480, speed: 1.2, size: 4.4, dmg: 18, range: 2.4, arena: 'jungle', phaseMsg: ['ORMEN RESER SINA FJÄDRAR', 'ORMEN RASAR – DJUNGELN VAKNAR!'] },
  cardinal: { title: 'BLODMÄSSANS HERDE', name: 'KARDINALEN', hp: 480, speed: 0.9, size: 4.0, dmg: 18, range: 2.2, arena: 'cathedral', phaseMsg: ['KARDINALEN HÖJER RÖKELSEKARET', 'KARDINALEN RASAR – KATEDRALEN BLÖDER!'] },
  queenbee: { title: 'SVÄRMENS MODER', name: 'BIDROTTNINGEN', hp: 460, speed: 1.4, size: 4.2, dmg: 17, range: 2.2, arena: 'hive', phaseMsg: ['BIDROTTNINGEN KALLAR PÅ SVÄRMEN', 'BIDROTTNINGEN RASAR – KUPAN SURRAR!'] },
  librarian: { title: 'VÄKTARE AV ALLT SOM SKRIVITS', name: 'BIBLIOTEKARIEN', hp: 440, speed: 1.0, size: 4.2, dmg: 16, range: 2.0, arena: 'library', phaseMsg: ['BIBLIOTEKARIEN SLÅR UPP NÄSTA KAPITEL', 'BIBLIOTEKARIEN RASAR – SIDORNA BRINNER!'] },
  colossus: { title: 'GJUTERIETS HERRE', name: 'SMIDESKOLOSSEN', hp: 520, speed: 0.75, size: 4.4, dmg: 20, range: 2.4, arena: 'foundry', phaseMsg: ['SMIDESKOLOSSEN ELDAR UPP UGNEN', 'SMIDESKOLOSSEN RASAR – METALLEN KOKAR!'] },
  mycelmother: { title: 'SVAMPRIKETS HJÄRTA', name: 'MYCELMODERN', hp: 470, speed: 0.6, size: 4.2, dmg: 17, range: 2.2, arena: 'fungus', phaseMsg: ['MYCELMODERN SPRIDER SINA SPORER', 'MYCELMODERN RASAR – HELA GROTTAN BLOMMAR!'] },
  mirrorking: { title: 'KUNGEN AV GLAS', name: 'SPEGELKUNGEN', hp: 450, speed: 1.2, size: 4.0, dmg: 16, range: 2.0, arena: 'mirror', phaseMsg: ['SPEGELKUNGEN SER DIG I VARJE SPEGEL', 'SPEGELKUNGEN RASAR – GLASET SPRICKER!'] },
  clockmaker: { title: 'TIDENS HERRE', name: 'URMAKAREN', hp: 440, speed: 0.9, size: 4.0, dmg: 16, range: 2.0, arena: 'clock', phaseMsg: ['URMAKAREN DRAR UPP URVERKET', 'URMAKAREN RASAR – TIDEN SPRICKER!'] },
  thunderbird: { title: 'STORMENS VINGAR', name: 'STORMFÅGELN', hp: 460, speed: 1.6, size: 4.4, dmg: 20, range: 2.4, arena: 'sky', phaseMsg: ['STORMFÅGELN KALLAR PÅ ÅSKAN', 'STORMFÅGELN RASAR – HIMLEN BRINNER!'] },
  crystalqueen: { title: 'SPEGLARNAS HÄRSKARINNA', name: 'KRISTALLDROTTNINGEN', hp: 420, speed: 1.1, size: 4.2, dmg: 16, range: 2.0, arena: 'crystal', phaseMsg: ['DROTTNINGEN SPLITTRAS – SKÄRVORNA VAKNAR', 'DROTTNINGEN BRINNER AV LJUS!'] },
  leviathan: { title: 'DJUPETS FASA', name: 'LEVIATAN', hp: 480, speed: 0.6, size: 4.2, dmg: 20, range: 2.6, arena: 'sunken', phaseMsg: ['LEVIATAN KALLAR PÅ DJUPET', 'LEVIATAN RASAR – HAVET STIGER!'] },
  pharaoh: { title: 'SANDENS HERRE', name: 'FARAONEN', hp: 380, speed: 1.0, size: 3.8, dmg: 18, range: 2.2, arena: 'tomb', phaseMsg: ['FARAONEN VÄCKER SINA TJÄNARE', 'FARAONEN RASAR – SANDEN STIGER!'] },
  ghost: { title: 'DEN SOM ALDRIG SOVER', name: 'VÅLNADEN', hp: 260, speed: 1.6, size: 2.3, dmg: 14, range: 1.4, arena: 'swamp', phaseMsg: ['VÅLNADEN VÄCKER DE DÖDA', 'VÅLNADENS SKRIK FYLLER LUFTEN!'] },
};
const BOSS_IDS = Object.keys(BOSSES).filter(id => !BOSSES[id].secret); // den hemliga slutbossen är inte med i rotationen
const bossPool = () => BOSS_IDS.filter(id => !window.Gen || !Gen.ARENAS || Gen.ARENAS.includes(BOSSES[id].arena)); // bara bossar vars arena bangeneratorn kan bygga
// föremål i rummen: bild (prop_<img>.png), antal rutor, höjd, blockerar, ljus, hur de används
const PROP_DEFS = {
  c: { img: 'candles', n: 3, size: 0.78, anim: 7, light: 0.75 },
  j: { img: 'bones', size: 0.22 },
  k: { img: 'coffin', size: 0.38, block: true },
  q: { img: 'bookshelf', size: 1.0, block: true, use: 'shelf' },
  u: { img: 'statue', size: 1.05, block: true },
  v: { img: 'cage', size: 0.95, block: true },
  w: { img: 'well', n: 2, size: 0.62, block: true, light: 0.55, use: 'well' },
  y: { img: 'altar', n: 2, size: 0.65, block: true, light: 0.55, use: 'altar' },
  e: { img: 'barrel_red', size: 0.55, block: true, boom: true },
  H: { img: 'armor', size: 0.95, block: true },
  J: { img: 'table', size: 0.5, block: true },
  T: { img: 'crate', size: 0.42, block: true, crate: true },
  z: { img: 'spikes', n: 2, size: 0.18, trap: true },
  i: { img: 'crystal', n: 2, size: 0.5, anim: 1.5, light: 0.7 },
  F: { img: 'mushroom', n: 2, size: 0.38, anim: 1.2, light: 0.45 },
  '(': { img: 'anvil', size: 0.42, block: true, use: 'anvil', fb: 'table' },
  ')': { img: 'fortune', n: 2, size: 0.62, block: true, use: 'fortune', light: 0.5, fb: 'altar' },
  '[': { img: 'prisoner', n: 2, size: 0.95, block: true, use: 'prisoner', fb: 'cage' },
  '?': { img: 'challenge', n: 2, size: 0.7, block: true, use: 'challenge', light: 0.7, fb: 'altar' },
  ';': { img: 'bowl', n: 2, size: 0.42, block: true, use: 'bowl', fb: 'well' },
  '/': { img: 'lever', n: 2, size: 0.5, block: true, use: 'lever', fb: 'statue' },
  '<': { img: 'arrowplate', n: 2, size: 0.1, trap: 'arrow' },
  '>': { img: 'gasvent', n: 2, size: 0.12, trap: 'gas' },
  '"': { img: 'web', size: 0.85, web: true },
  '£': { img: 'npc_alchemist', src: 'npc_alchemist', n: 4, anim: 5, size: 0.95, block: true, use: 'alchemist', fb: 'prisoner', npc: true },
  '€': { img: 'npc_priest', src: 'npc_priest', n: 4, anim: 4, size: 0.95, block: true, use: 'priest', fb: 'prisoner', npc: true },
  '©': { img: 'petcage', n: 2, size: 0.8, block: true, use: 'petcage', fb: 'cage' },
  // version 6: fällor och fat
  '°': { img: 'firejet', n: 2, size: 0.3, trap: 'fire', fb: 'gasvent' },
  '±': { img: 'pendulum', size: 1.0, trap: 'pendulum', fb: 'statue' },
  '¨': { img: 'pressureplate', n: 2, size: 0.08, trap: 'plate', fb: 'arrowplate' },
  'µ': { img: 'barrel_poison', size: 0.55, block: true, boom: 'poison', fb: 'barrel_red' },
  'ß': { img: 'barrel_frost', size: 0.55, block: true, boom: 'frost', fb: 'barrel_red' },
  '¶': { img: 'campfire', n: 4, anim: 9, size: 0.6, block: true, use: 'camp', light: 1.0, fb: 'candles' },
  '®': { img: 'questboard', size: 0.95, block: true, use: 'quests', fb: 'bookshelf' },
  '³': { img: 'alarmbell', n: 2, size: 0.85, block: true, bell: true, fb: 'statue' },
  'ç': { img: 'npc_gambler', src: 'npc_gambler', n: 4, anim: 4, size: 0.95, block: true, use: 'gamble', fb: 'prisoner', npc: true },
  'ÿ': { img: 'npc_banker', src: 'npc_banker', n: 4, anim: 4, size: 0.95, block: true, use: 'bank', fb: 'prisoner', npc: true },
  'ý': { img: 'npc_wanderer', src: 'npc_wanderer', n: 4, anim: 4, size: 0.95, block: true, use: 'wander', fb: 'prisoner', npc: true },
  'Ů': { img: 'npc_banker', src: 'npc_banker', n: 4, anim: 4, size: 0.95, block: true, use: 'hubWeapons', fb: 'prisoner', npc: true },
  'Ĥ': { img: 'altar', n: 2, size: 0.75, block: true, light: 0.7, use: 'hubAltar' },
  'Ħ': { img: 'npc_priest', src: 'npc_priest', n: 4, anim: 4, size: 0.95, block: true, use: 'hubArchive', fb: 'prisoner', npc: true },
  'Ĩ': { img: 'npc_alchemist', src: 'npc_alchemist', n: 4, anim: 5, size: 0.95, block: true, use: 'hubTrainer', fb: 'prisoner', npc: true },
  'Ī': { img: 'bookshelf', size: 1.0, block: true, use: 'hubChronicle' },
  'Ĭ': { img: 'npc_wanderer', src: 'npc_wanderer', n: 4, anim: 4, size: 0.95, block: true, use: 'hubUnlocks', fb: 'prisoner', npc: true },
  'Ƨ': { img: 'fountain', n: 2, size: 0.9, block: true, use: 'fountain', light: 0.2, fb: 'well' },
  'ƨ': { img: 'statue2', n: 1, size: 1.0, block: true, fb: 'statue' },
  'Ʃ': { img: 'falsedoor', n: 2, size: 1.0, block: true, use: 'falsedoor', fb: 'coffin' },
  'ƪ': { img: 'dreamlamp', n: 3, anim: 4, size: 0.7, block: false, light: 0.7, fb: 'statue' },
  'ǎ': { img: 'cannon', n: 2, size: 0.6, block: true, use: 'cannon', fb: 'anvil' },
  'ǐ': { img: 'shiplantern', n: 2, anim: 3, size: 0.75, block: false, light: 0.7, fb: 'candles' },
  'Ǒ': { img: 'powderkeg', size: 0.6, block: true, boom: true, fb: 'barrel_red' },
  'ǝ': { img: 'flaskshelf', n: 2, size: 1.0, block: true, boom: 'flask', fb: 'bookshelf' },
  'Ǟ': { img: 'teslacoil', n: 3, size: 1.0, block: true, light: 0.6, fb: 'lightningrod' },
  'ǟ': { img: 'alembic', n: 2, anim: 3, size: 0.7, block: true, use: 'alembic', light: 0.3, fb: 'altar' },
  // version 18: cirkusen och djungeltemplet
  // version 20: kloakerna och öknen
  'ȶ': { img: 'sluicewheel', n: 2, size: 0.8, block: true, use: 'sluicewheel', fb: 'statue' },
  'ȸ': { img: 'ratnest', n: 2, size: 0.8, block: true, fb: 'crate' },
  'ȹ': { img: 'cactus', n: 1, size: 0.95, block: true, fb: 'statue' },
  'Ⱥ': { img: 'amphora', n: 2, size: 0.6, block: true, fb: 'crate' },
  'ɦ': { img: 'bathstatue', n: 1, size: 1.0, block: true, fb: 'statue' },
  'ɧ': { img: 'bathfountain', n: 2, anim: 4, size: 0.95, block: true, fb: 'statue' },
  'ɨ': { img: 'bathbench', n: 1, size: 0.7, block: true, fb: 'crate' },
  'ɲ': { img: 'chainedsoul', n: 2, size: 1.0, block: true, fb: 'statue' },
  'ɳ': { img: 'bonepillar', n: 1, size: 1.1, block: true, fb: 'statue' },
  'ɴ': { img: 'brimpot', n: 2, anim: 4, size: 0.75, block: true, light: 1.2, lightR: 6, fb: 'candles' },
  'ʁ': { img: 'meathook', n: 2, size: 0.8, block: false, v21hit: true, fb: 'crate' },
  'ʂ': { img: 'butcherblock', n: 1, size: 0.7, block: true, fb: 'crate' },
  'ʃ': { img: 'bandsaw', n: 2, anim: 6, size: 0.95, block: true, fb: 'statue' },
  'ʍ': { img: 'catapult', n: 1, size: 1.1, block: true, fb: 'statue' },
  'ʎ': { img: 'warbanner', n: 2, anim: 3, size: 1.0, block: true, fb: 'statue' },
  'ʏ': { img: 'stakes', n: 1, size: 0.75, block: true, fb: 'statue' },
  // version 30 (SPEL): Ruinstaden och Glasbruket
  'ʢ': { img: 'brokencolumn', n: 1, size: 1.0, block: true, fb: 'statue' },
  'ʣ': { img: 'fallenbeam', n: 1, size: 0.85, block: true, fb: 'crate' },
  'ʤ': { img: 'ruinstatue', n: 1, size: 1.05, block: true, fb: 'statue' },
  'ʥ': { img: 'furnace', n: 2, anim: 5, size: 1.1, block: true, light: 1.3, lightR: 6, fb: 'statue' },
  'ʦ': { img: 'glassrack', n: 1, size: 0.95, block: true, fb: 'crate' },
  'ʧ': { img: 'glassbench', n: 1, size: 0.7, block: true, fb: 'crate' },
  'ɏ': { img: 'hangcage', n: 2, size: 0.75, block: false, v21hit: true, fb: 'crate' },
  'ɐ': { img: 'rack', n: 1, size: 0.9, block: true, fb: 'statue' },
  'ɑ': { img: 'gallows', n: 2, size: 1.3, block: true, fb: 'statue' },
  'ɒ': { img: 'harborlamp', n: 2, anim: 3, size: 0.9, block: true, light: 1.1, lightR: 6, fb: 'candles' },
  'ɓ': { img: 'fishbarrel', n: 2, size: 0.65, block: true, fb: 'crate' },
  'ɔ': { img: 'anchor', n: 1, size: 0.9, block: true, fb: 'statue' },
  'Ȼ': { img: 'brazier2', n: 2, anim: 4, size: 0.7, block: true, light: 1.3, lightR: 7, fb: 'candles' },
  // version 19: gruvan och observatoriet
  'ț': { img: 'minecart', n: 2, size: 0.85, block: true, use: 'minecart', fb: 'crate' },
  'Ȝ': { img: 'dynamite', n: 1, size: 0.55, block: true, boom: true, fb: 'powderkeg' },
  'ȝ': { img: 'carbidelamp', n: 2, anim: 3, size: 0.6, block: false, light: 0.5, fb: 'candles' },
  'Ȟ': { img: 'orrery', n: 3, anim: 3, size: 0.95, block: true, use: 'orrery', light: 0.2, fb: 'statue' },
  'ȟ': { img: 'telescope', n: 1, size: 1.0, block: true, use: 'telescope', fb: 'statue' },
  'Ƞ': { img: 'starportal', n: 2, anim: 4, size: 0.9, block: false, light: 0.25, fb: 'candles' },
  '¸': { img: 'boulder2', n: 1, size: 0.75, block: true, fb: 'statue' },
  'ǳ': { img: 'knifewheel', n: 2, size: 1.0, block: true, fb: 'statue' },
  'Ǵ': { img: 'prizewheel', n: 2, size: 1.0, block: true, use: 'prizewheel', fb: 'statue' },
  'ǵ': { img: 'balloons', n: 2, anim: 2, size: 0.9, block: false, balloon: true, fb: 'candles' },
  'Ƕ': { img: 'marquee', n: 2, anim: 3, size: 0.8, block: false, light: 0.55, fb: 'candles' },
  'Ȅ': { img: 'goldidol', n: 2, size: 0.6, block: true, use: 'goldidol', light: 0.25, fb: 'altar' },
  'ȅ': { img: 'dartidol', n: 2, size: 0.9, block: true, fb: 'statue' },
  'Ȇ': { img: 'poisonflower', n: 2, size: 0.55, block: false, fb: 'bones' },
  'ȇ': { img: 'tikitorch', n: 2, anim: 4, size: 0.85, block: true, light: 0.7, fb: 'candles' },
  'Ǝ': { img: 'pew', n: 1, size: 0.7, block: true, fb: 'coffin' },
  'Ə': { img: 'bloodfont', n: 2, size: 0.8, block: true, use: 'bloodfont', light: 0.3, fb: 'altar' },
  'Ɛ': { img: 'bell', n: 2, size: 0.9, block: true, use: 'bell', fb: 'statue' },
  'Ɨ': { img: 'larvasac', n: 2, size: 0.75, block: true, use: 'larvasac', fb: 'coffin' },
  'Ű': { img: 'lectern', n: 2, size: 0.8, block: true, use: 'lectern', light: 0.3, fb: 'altar' },
  'ű': { img: 'chandelier', n: 3, anim: 6, size: 0.95, block: false, light: 0.75, fb: 'statue' },
  'Ż': { img: 'press', n: 3, size: 1.0, block: true, fb: 'statue' },
  'ż': { img: 'anvil2', n: 1, size: 0.6, block: true, fb: 'statue' },
  'Ŧ': { img: 'glowshroom', n: 4, anim: 3, size: 0.75, block: true, light: 0.55, fb: 'statue' },
  'ŧ': { img: 'mirrorstatue', n: 1, size: 1.0, block: true, fb: 'statue' },
  'Œ': { img: 'legendaltar', n: 2, size: 0.85, block: true, use: 'legend', light: 0.6, fb: 'altar' },
  'Ņ': { img: 'clockwork', n: 4, anim: 4, size: 0.9, block: true, light: 0.35, fb: 'statue' },
  'ņ': { img: 'lightningrod', n: 2, size: 1.0, block: true, fb: 'statue' },
  'Ň': { img: 'chimes', n: 2, size: 0.85, block: true, use: 'chimes', fb: 'altar' },
  'ň': { img: 'cloudchest', n: 2, size: 0.6, block: true, use: 'cloudchest', fb: 'coffin' },
  'Ė': { img: 'prismcrystal', n: 2, size: 0.95, block: true, fb: 'crystal' },
  'Ę': { img: 'glowcrystal', n: 4, anim: 4, size: 0.8, block: true, light: 0.9, fb: 'crystal' },
  'Ě': { img: 'wreckchest', n: 2, size: 0.7, block: true, use: 'wreck', fb: 'coffin' },
  'Ĝ': { img: 'bubbles', n: 4, anim: 4, size: 0.5, under: 'Đ', fb: 'gasvent' },
  'Ē': { img: 'crystalspikes', n: 2, size: 0.55, trap: true, fb: 'spikes' },
  'Ğ': { img: 'npc_cartographer', src: 'npc_cartographer', n: 4, anim: 4, size: 0.95, block: true, use: 'cartographer', fb: 'prisoner', npc: true },
  'Ġ': { img: 'talentaltar', n: 2, size: 0.8, block: true, use: 'talent', fb: 'altar' },
  '²': { img: 'sarcophagus', n: 2, size: 0.75, block: true, use: 'sarco', fb: 'coffin' },
  '÷': { img: 'stairs', size: 0.8, block: true, use: 'stairs', light: 0.4, fb: 'well' },
};
const bossFor = depth => run && run.practice && run.practice.boss ? run.practice.boss : BOSSES[params.get('boss')] ? params.get('boss') : RNG(run.seed).fork('bossar').shuffle(bossPool())[cycleOf(depth) % BOSS_IDS.length]; // ?boss=id för test
const ELITE_MODS = [
  { id: 'fast', name: 'SNABB', tint: [120, 220, 255] },
  { id: 'tough', name: 'SEG', tint: [180, 180, 180] },
  { id: 'vamp', name: 'BLODTÖRSTIG', tint: [255, 60, 60] },
  { id: 'explosive', name: 'EXPLOSIV', tint: [255, 170, 40] },
  { id: 'brute', name: 'BRUTAL', tint: [200, 90, 255] },
  { id: 'teleport', name: 'SPRÅNGANDE', tint: [255, 120, 220] },
  { id: 'regen', name: 'SEGLIVAD', tint: [110, 255, 140] },
  { id: 'shielded', name: 'SKÖLDAD', tint: [140, 190, 255] },
  { id: 'splitter', name: 'DELANDE', tint: [255, 200, 120] },
  { id: 'venom', name: 'GIFTIG', tint: [150, 255, 80] },
  { id: 'frost', name: 'ISKALL', tint: [170, 230, 255] },
  { id: 'flicker', name: 'FLIMRANDE', tint: [220, 200, 255] },
  { id: 'mirror', name: 'SPEGLANDE', tint: [200, 230, 255] },
  { id: 'caller', name: 'KALLANDE', tint: [255, 230, 150] },
  { id: 'stalker', name: 'SMYGANDE', tint: [150, 150, 170] },
  { id: 'burning', name: 'BRINNANDE', tint: [255, 120, 40] },
  { id: 'magnet', name: 'MAGNETISK', tint: [150, 120, 255] },
  { id: 'undying', name: 'ODÖDLIG', tint: [200, 255, 200] },
  { id: 'thorny', name: 'TAGGIG', tint: [180, 220, 120] },
  { id: 'evasive', name: 'UNDVIKANDE', tint: [200, 200, 255] },
  { id: 'giant', name: 'JÄTTE', tint: [230, 190, 150] },
  { id: 'tempo', name: 'TIDSBUNDEN', tint: [200, 170, 255] },
  { id: 'storm', name: 'ÅSKANDE', tint: [210, 230, 255] },
  { id: 'prismatic', name: 'PRISMATISK', tint: [255, 160, 230] },
  { id: 'gusty', name: 'STORMVIND', tint: [220, 245, 255] },
];
const NEW_ENEMIES = ['U', 'X', 'Y', '!', '@', '^', '+', 'Å', 'Ä', 'Ö', 'É', 'Ü', 'Ñ', 'Æ', 'Þ', 'Ð', 'Ý', 'Ã', 'Õ', 'Ê', 'Î', 'Ô', 'Ë', 'Í', 'Ï', 'Ó', 'Ú', 'Û', 'Ā', 'Ă', 'ĳ', 'Ĵ', 'ĵ', 'Ķ', 'ķ', 'ĸ', 'Ō', 'ō', 'Ŏ', 'ŏ', 'Ő', 'ő', 'ŗ', 'Ř', 'ř', 'Ś', 'ś', 'Ŝ', 'Ų', 'ų', 'Ŵ', 'Ž', 'ž', 'ſ', 'Ƅ', 'ƅ', 'Ɔ', 'Ƈ', 'ƈ', 'Ɖ', 'Ƒ', 'ƒ', 'Ɯ', 'Ƙ', 'ƙ', 'ƚ', 'ƫ', 'Ƭ', 'ƭ', 'Ʈ', 'Ư', 'ư', 'Ǖ', 'ǖ', 'Ǘ', 'ǘ', 'Ǚ', 'ǚ', 'ǣ', 'Ǥ', 'ǥ', 'Ǧ', 'ǧ', 'Ǩ', 'Ƿ', 'Ǹ', 'ǹ', 'Ǻ', 'ǻ', 'Ǽ', 'Ȉ', 'ȉ', 'Ȋ', 'ȋ', 'Ȍ', 'ȍ', 'ȡ', 'Ȣ', 'ȣ', 'Ȥ', 'ȥ', 'Ȧ', 'ȧ', 'Ȩ', 'ȼ', 'Ƚ', 'Ⱦ', 'ȿ', 'ɀ', 'Ɂ', 'ɂ', 'Ƀ', 'ɕ', 'ɖ', 'ɗ', 'ɘ', 'ə', 'ɚ', 'ɛ', 'ɜ', 'ɩ', 'ɪ', 'ɫ', 'ɬ', 'ɵ', 'ɶ', 'ɷ', 'ɸ', 'ʄ', 'ʅ', 'ʆ', 'ʇ', 'ʐ', 'ʑ', 'ʒ', 'ʓ', 'ʨ', 'ʩ', 'ʪ', 'ʫ', 'ʮ', 'ʯ', 'ʰ', 'ʱ'];
async function loadEnemySheet(k, d) {
  const sets = {};
  for (const [st, file] of [['idle', 'idle'], ['move', d.move], ['attack', 'attack'], ['pain', 'take_damage'], ['death', 'death']]) { const img = await load(`${A}gfx/enemies-${d.sheet}_${file}.png`); sets[st] = strip(img, Math.max(1, Math.round(img.width / (d.fw || img.height)))); } // kvadratiska rutor
  for (const extra of ['burrow', 'anchored']) if ((extra === 'burrow' && d.ai === 'lavaworm') || (extra === 'anchored' && d.ai === 'windspirit')) { try { const img = await load(`${A}gfx/enemies-${d.sheet}_${extra}.png`); sets[extra] = strip(img, Math.max(1, Math.round(img.width / (d.fw || img.height)))); } catch (e) { /* valfri */ } }
  if (d.ai === 'mirrorknight') { try { const img = await load(`${A}gfx/enemies-${d.sheet}_block.png`); sets.block = strip(img, Math.max(1, Math.round(img.width / (d.fw || img.height)))); } catch (e) { /* valfri */ } }
  if (d.ai === 'clocksoldier') { try { const img = await load(`${A}gfx/enemies-${d.sheet}_rewind.png`); sets.rewind = strip(img, Math.max(1, Math.round(img.width / (d.fw || img.height)))); } catch (e) { /* valfri */ } }
  enemyFrames[k] = sets;
}
const BOSS_FW = { flame: 0 }; // bossrutornas bredd när de inte är kvadratiska
async function loadAll(setStatus) {
  const walls = ['wall_brick_stone_center', 'wall_brick_small_stone', 'wall_rock', 'wall_stone', 'wall_brick_stone_center_banner', 'door_metal_gate', 'door_wood',
    'wall_forest', 'wall_cemetery', 'wall_cave', 'wall_house', 'wall_house_window', ...BOSS_IDS.map(b => 'wall_boss_' + b), 'wall_swamp', 'wall_cracked', 'door_locked', 'wall_frost', 'wall_ice_crystal', 'wall_obsidian', 'wall_boss_volcano', 'wall_sandstone', 'wall_hieroglyph', 'wall_crystal', 'wall_crystal_vein', 'wall_ruin_sunken', 'wall_coral', 'wall_brass', 'wall_gear', 'wall_gear2', 'wall_cloudstone', 'wall_stormwall', 'wall_mycel', 'wall_mushroomcap', 'wall_marble', 'wall_mirror', 'wall_bookshelf', 'wall_libpanel', 'wall_ironplate', 'wall_furnace', 'wall_cathedral', 'wall_stainedglass', 'wall_wax', 'wall_honeycomb', 'wall_hedge', 'wall_gardenwall', 'wall_dream', 'wall_dreamshift', 'wall_hull', 'wall_rigging', 'wall_labtile', 'wall_jars', 'wall_tent', 'wall_cage', 'wall_junglestone', 'wall_jungle', 'wall_timber', 'wall_orevein', 'wall_brass2', 'wall_starchart', 'wall_sewerbrick', 'wall_pipes', 'wall_dune', 'wall_mesa', 'wall_prisonstone', 'wall_cellbars', 'wall_shack', 'wall_quay', 'wall_bathmosaic', 'wall_bathcolumn', 'wall_flesh', 'wall_bone', 'wall_abattoirtile', 'wall_coldroom', 'wall_palisade', 'wall_earthwork'];
  const floors = ['floor_stone', 'floor_stone_pattern', 'floor_wood_planks', 'floor_tiles_blue',
    'floor_ground_grass', 'floor_ground_dirt', 'floor_grass_dead', 'floor_gravel', 'floor_cave', 'floor_mud', 'ceil_cave', ...BOSS_IDS.map(b => 'floor_boss_' + b), 'floor_swamp', 'floor_water', 'floor_water2', 'floor_lava', 'floor_lava2', 'floor_ice', 'floor_snow', 'floor_frost_stone', 'floor_ash', 'floor_basalt', 'floor_pit', 'floor_crack', 'floor_boss_volcano', 'floor_sand', 'floor_gold_tiles', 'floor_quicksand', 'floor_crystal', 'floor_sunken_tiles', 'floor_deepwater', 'floor_deepwater2', 'floor_shallow', 'floor_brass', 'floor_cloud', 'floor_sawtrack', 'floor_void', 'floor_wind', 'floor_moss', 'floor_marble', 'floor_bouncepad', 'floor_sporepool', 'floor_teleport', 'floor_carpet', 'floor_irongrate', 'floor_ink', 'floor_conveyor', 'floor_conveyor2', 'floor_molten', 'floor_vent', 'floor_cathedral', 'floor_hivefloor', 'floor_lightbeam', 'floor_honey', 'floor_garden', 'floor_dream', 'floor_thorns', 'floor_dreammist', 'floor_deck', 'floor_hold', 'floor_labtile', 'floor_rotplank', 'floor_wetdeck', 'floor_acid', 'floor_transmute', 'floor_sawdust', 'floor_ring', 'floor_jungle', 'floor_templestone', 'floor_trapdoor', 'floor_spotlight', 'floor_piranha', 'floor_vines', 'floor_minedirt', 'floor_planks2', 'floor_brasstile', 'floor_rail', 'floor_rail_h', 'floor_rail_v', 'floor_gas2', 'floor_cavein', 'floor_starmap', 'floor_domeslit', 'floor_sewer', 'floor_grate', 'floor_desertsand', 'floor_ruintile', 'floor_sludge', 'floor_spray', 'floor_oasis', 'floor_mirage', 'floor_prison', 'floor_straw', 'floor_dock', 'floor_cobble', 'floor_alarmplate', 'floor_net', 'floor_bathtile', 'floor_mosaic', 'floor_ashfield', 'floor_brimstone', 'floor_hotpool', 'floor_steamvent', 'floor_coldpool', 'floor_firestream', 'floor_runecircle', 'floor_abattoir', 'floor_bloodgrate', 'floor_battlemud', 'floor_trench', 'floor_bloodslick', 'floor_grinder', 'floor_deepmud', 'floor_target'];
  const OPTIONAL = /_boss_|swamp|water|lava|ice|cracked|locked|frost|snow|obsidian|ash|basalt|pit|crack|sand|hieroglyph|gold_tiles|crystal|sunken|deepwater|shallow|coral|ruin|brass|gear|cloud|storm|sawtrack|void|wind|mycel|mushroom|marble|mirror|moss|bouncepad|sporepool|teleport|bookshelf|libpanel|ironplate|furnace|carpet|irongrate|ink|conveyor|molten|vent|cathedral|stainedglass|wax|honeycomb|hivefloor|lightbeam|honey|hedge|gardenwall|dream|garden|thorns|hull|rigging|labtile|jars|deck|hold|rotplank|acid|transmute|tent|cage|jungle|templestone|sawdust|ring|trapdoor|spotlight|piranha|vines|timber|orevein|brass2|starchart|minedirt|planks2|brasstile|rail|gas2|cavein|starmap|domeslit|sewer|pipes|dune|mesa|grate|desertsand|ruintile|sludge|spray|oasis|mirage|prisonstone|cellbars|shack|quay|floor_prison|straw|dock|cobble|alarmplate|floor_net|bathmosaic|bathcolumn|flesh|wall_bone|bathtile|mosaic|ashfield|floor_brimstone|hotpool|steamvent|coldpool|firestream|runecircle|abattoir|coldroom|palisade|earthwork|bloodgrate|battlemud|trench|bloodslick|grinder|deepmud|floor_target/;
  for (const n of walls.concat(floors)) { try { tex[n] = pixels(await load(A + 'wall/' + n + '.png')); } catch (e) { if (!OPTIONAL.test(n)) throw e; } }
  for (const [n, k] of [['wall_wax', 0.66], ['wall_honeycomb', 0.7], ['floor_hivefloor', 0.62], ['floor_boss_queenbee', 0.68], ['wall_labtile', 0.74], ['floor_labtile', 0.76], ['floor_transmute', 0.78], ['floor_boss_alchemist', 0.76], ['floor_brasstile', 0.8], ['wall_brass2', 0.86], ['floor_starmap', 0.86], ['floor_ruintile', 0.78], ['floor_desertsand', 0.86], ['wall_dune', 0.9], ['wall_mesa', 0.9], ['floor_boss_sphinx', 0.85], ['floor_oasis', 0.9]]) { const t = tex[n]; if (!t) continue; const d = t.data; for (let i = 0; i < d.length; i++) { const v = d[i]; d[i] = (v & 0xff000000) | (Math.round(((v >>> 16) & 255) * k) << 16) | (Math.round(((v >>> 8) & 255) * k) << 8) | Math.round((v & 255) * k); } } // bikupans vax och laboratoriets kakel är ljusare än de andra biomernas
  tex.wall_swamp = tex.wall_swamp || tex.wall_forest; tex.wall_cracked = tex.wall_cracked || tex.wall_brick_stone_center; tex.door_locked = tex.door_locked || tex.door_wood;
  tex.floor_swamp = tex.floor_swamp || tex.floor_mud; tex.floor_water = tex.floor_water || tex.floor_tiles_blue; tex.floor_water2 = tex.floor_water2 || tex.floor_water;
  tex.wall_frost = tex.wall_frost || tex.wall_stone; tex.floor_snow = tex.floor_snow || tex.floor_tiles_blue; tex.floor_frost_stone = tex.floor_frost_stone || tex.floor_stone;
  tex.wall_obsidian = tex.wall_obsidian || tex.wall_rock; tex.wall_boss_volcano = tex.wall_boss_volcano || tex.wall_boss_beast || tex.wall_obsidian;
  tex.floor_ash = tex.floor_ash || tex.floor_gravel; tex.floor_basalt = tex.floor_basalt || tex.floor_cave || tex.floor_stone; tex.floor_boss_volcano = tex.floor_boss_volcano || tex.floor_boss_beast || tex.floor_basalt;
  tex.wall_sandstone = tex.wall_sandstone || tex.wall_stone; tex.wall_hieroglyph = tex.wall_hieroglyph || tex.wall_sandstone; tex.wall_boss_pharaoh = tex.wall_boss_pharaoh || tex.wall_sandstone;
  tex.wall_crystal = tex.wall_crystal || tex.wall_ice_crystal || tex.wall_cave; tex.wall_crystal_vein = tex.wall_crystal_vein || tex.wall_crystal; tex.wall_ruin_sunken = tex.wall_ruin_sunken || tex.wall_stone; tex.wall_coral = tex.wall_coral || tex.wall_ruin_sunken;
  tex.floor_crystal = tex.floor_crystal || tex.floor_cave || tex.floor_stone; tex.floor_sunken_tiles = tex.floor_sunken_tiles || tex.floor_tiles_blue; tex.floor_deepwater = tex.floor_deepwater || tex.floor_water; tex.floor_deepwater2 = tex.floor_deepwater2 || tex.floor_deepwater; tex.floor_shallow = tex.floor_shallow || tex.floor_water;
  for (const b of BOSS_IDS) { tex['wall_boss_' + b] = tex['wall_boss_' + b] || tex.wall_boss_demon || tex.wall_stone; tex['floor_boss_' + b] = tex['floor_boss_' + b] || tex.floor_boss_demon || tex.floor_stone; }
  tex.wall_hedge = tex.wall_hedge || tex.wall_forest || tex.wall_stone; tex.wall_gardenwall = tex.wall_gardenwall || tex.wall_stone; tex.wall_dream = tex.wall_dream || tex.wall_obsidian || tex.wall_stone; tex.wall_dreamshift = tex.wall_dreamshift || tex.wall_dream;
  tex.floor_garden = tex.floor_garden || tex.floor_gravel; tex.floor_dream = tex.floor_dream || tex.floor_tiles_blue; tex.floor_thorns = tex.floor_thorns || tex.floor_grass_dead || tex.floor_garden; tex.floor_dreammist = tex.floor_dreammist || tex.floor_dream;
  tex.wall_hull = tex.wall_hull || tex.wall_house || tex.wall_stone; tex.wall_rigging = tex.wall_rigging || tex.wall_hull; tex.wall_labtile = tex.wall_labtile || tex.wall_marble || tex.wall_stone; tex.wall_jars = tex.wall_jars || tex.wall_bookshelf || tex.wall_labtile; // version 17
  tex.floor_deck = tex.floor_deck || tex.floor_wood_planks; tex.floor_hold = tex.floor_hold || tex.floor_deck; tex.floor_labtile = tex.floor_labtile || tex.floor_tiles_blue; tex.floor_rotplank = tex.floor_rotplank || tex.floor_crack || tex.floor_deck;
  tex.wall_timber = tex.wall_timber || tex.wall_cave || tex.wall_stone; tex.wall_orevein = tex.wall_orevein || tex.wall_crystal_vein || tex.wall_timber; tex.wall_brass2 = tex.wall_brass2 || tex.wall_brass || tex.wall_stone; tex.wall_starchart = tex.wall_starchart || tex.wall_brass2; // version 19
  tex.floor_minedirt = tex.floor_minedirt || tex.floor_ground_dirt || tex.floor_cave; tex.floor_planks2 = tex.floor_planks2 || tex.floor_wood_planks; tex.floor_brasstile = tex.floor_brasstile || tex.floor_brass || tex.floor_tiles_blue; tex.floor_rail = tex.floor_rail || tex.floor_planks2;
  tex.floor_gas2 = tex.floor_gas2 || tex.floor_swamp || tex.floor_minedirt; tex.floor_cavein = tex.floor_cavein || tex.floor_crack || tex.floor_minedirt; tex.floor_starmap = tex.floor_starmap || tex.floor_teleport || tex.floor_brasstile; tex.floor_domeslit = tex.floor_domeslit || tex.floor_void || tex.floor_brasstile;
  tex.wall_sewerbrick = tex.wall_sewerbrick || tex.wall_brick_small_stone || tex.wall_stone; tex.wall_pipes = tex.wall_pipes || tex.wall_ironplate || tex.wall_sewerbrick; tex.wall_dune = tex.wall_dune || tex.wall_sandstone || tex.wall_stone; tex.wall_mesa = tex.wall_mesa || tex.wall_dune; // version 20
  tex.floor_sewer = tex.floor_sewer || tex.floor_stone; tex.floor_grate = tex.floor_grate || tex.floor_irongrate || tex.floor_sewer; tex.floor_desertsand = tex.floor_desertsand || tex.floor_sand || tex.floor_gravel; tex.floor_ruintile = tex.floor_ruintile || tex.floor_gold_tiles || tex.floor_stone_pattern;
  tex.floor_sludge = tex.floor_sludge || tex.floor_swamp || tex.floor_mud; tex.floor_spray = tex.floor_spray || tex.floor_vent || tex.floor_grate; tex.floor_oasis = tex.floor_oasis || tex.floor_shallow || tex.floor_water; tex.floor_mirage = tex.floor_mirage || tex.floor_desertsand;
  tex.wall_prisonstone = tex.wall_prisonstone || tex.wall_brick_small_stone || tex.wall_stone; tex.wall_cellbars = tex.wall_cellbars || tex.wall_cage || tex.wall_prisonstone; tex.wall_shack = tex.wall_shack || tex.wall_timber || tex.wall_hull || tex.wall_stone; tex.wall_quay = tex.wall_quay || tex.wall_ruin_sunken || tex.wall_stone; /* version 21 */
  tex.floor_prison = tex.floor_prison || tex.floor_stone; tex.floor_straw = tex.floor_straw || tex.floor_sawdust || tex.floor_prison; tex.floor_dock = tex.floor_dock || tex.floor_deck || tex.floor_planks2 || tex.floor_stone; tex.floor_cobble = tex.floor_cobble || tex.floor_stone_pattern || tex.floor_stone;
  tex.floor_alarmplate = tex.floor_alarmplate || tex.floor_irongrate || tex.floor_prison; tex.floor_net = tex.floor_net || tex.floor_dock;
  tex.wall_bathmosaic = tex.wall_bathmosaic || tex.wall_marble || tex.wall_stone; tex.wall_bathcolumn = tex.wall_bathcolumn || tex.wall_bathmosaic; tex.wall_flesh = tex.wall_flesh || tex.wall_cathedral || tex.wall_stone; tex.wall_bone = tex.wall_bone || tex.wall_cemetery || tex.wall_stone; /* version 22 */
  tex.floor_bathtile = tex.floor_bathtile || tex.floor_marble || tex.floor_stone; tex.floor_mosaic = tex.floor_mosaic || tex.floor_bathtile; tex.floor_ashfield = tex.floor_ashfield || tex.floor_ash || tex.floor_stone; tex.floor_brimstone = tex.floor_brimstone || tex.floor_basalt || tex.floor_ashfield;
  tex.floor_hotpool = tex.floor_hotpool || tex.floor_shallow || tex.floor_water; tex.floor_steamvent = tex.floor_steamvent || tex.floor_vent || tex.floor_bathtile; tex.floor_coldpool = tex.floor_coldpool || tex.floor_shallow || tex.floor_water; tex.floor_firestream = tex.floor_firestream || tex.floor_lava; tex.floor_runecircle = tex.floor_runecircle || tex.floor_teleport || tex.floor_ashfield;
  tex.wall_abattoirtile = tex.wall_abattoirtile || tex.wall_labtile || tex.wall_stone; tex.wall_coldroom = tex.wall_coldroom || tex.wall_abattoirtile; tex.wall_palisade = tex.wall_palisade || tex.wall_timber || tex.wall_stone; tex.wall_earthwork = tex.wall_earthwork || tex.wall_cave || tex.wall_stone; /* version 23 */
  tex.floor_abattoir = tex.floor_abattoir || tex.floor_labtile || tex.floor_stone; tex.floor_bloodgrate = tex.floor_bloodgrate || tex.floor_grate || tex.floor_abattoir; tex.floor_battlemud = tex.floor_battlemud || tex.floor_mud || tex.floor_stone; tex.floor_trench = tex.floor_trench || tex.floor_planks2 || tex.floor_battlemud;
  tex.floor_bloodslick = tex.floor_bloodslick || tex.floor_abattoir; tex.floor_grinder = tex.floor_grinder || tex.floor_sawtrack || tex.floor_abattoir; tex.floor_deepmud = tex.floor_deepmud || tex.floor_swamp || tex.floor_battlemud; tex.floor_target = tex.floor_target || tex.floor_battlemud;
  tex.wall_tent = tex.wall_tent || tex.wall_house || tex.wall_stone; tex.wall_cage =tex.wall_cage || tex.wall_tent; tex.wall_junglestone = tex.wall_junglestone || tex.wall_ruin_sunken || tex.wall_stone; tex.wall_jungle = tex.wall_jungle || tex.wall_forest || tex.wall_junglestone; // version 18
  tex.floor_sawdust = tex.floor_sawdust || tex.floor_sand || tex.floor_wood_planks; tex.floor_ring = tex.floor_ring || tex.floor_carpet || tex.floor_sawdust; tex.floor_jungle = tex.floor_jungle || tex.floor_ground_dirt; tex.floor_templestone = tex.floor_templestone || tex.floor_stone_pattern;
  tex.floor_trapdoor = tex.floor_trapdoor || tex.floor_wood_planks; tex.floor_spotlight = tex.floor_spotlight || tex.floor_lightbeam || tex.floor_sawdust; tex.floor_piranha = tex.floor_piranha || tex.floor_shallow || tex.floor_water; tex.floor_vines = tex.floor_vines || tex.floor_thorns || tex.floor_jungle;
  tex.floor_wetdeck = tex.floor_wetdeck || tex.floor_shallow || tex.floor_deck; tex.floor_acid = tex.floor_acid || tex.floor_sporepool || tex.floor_swamp; tex.floor_transmute = tex.floor_transmute || tex.floor_teleport || tex.floor_labtile;
  tex.wall_cathedral = tex.wall_cathedral || tex.wall_stone; tex.wall_stainedglass = tex.wall_stainedglass || tex.wall_cathedral; tex.wall_wax = tex.wall_wax || tex.wall_cave || tex.wall_stone; tex.wall_honeycomb = tex.wall_honeycomb || tex.wall_wax;
  tex.floor_cathedral = tex.floor_cathedral || tex.floor_stone_pattern; tex.floor_hivefloor = tex.floor_hivefloor || tex.floor_sand || tex.floor_stone; tex.floor_lightbeam = tex.floor_lightbeam || tex.floor_cathedral; tex.floor_honey = tex.floor_honey || tex.floor_hivefloor;
  tex.wall_bookshelf = tex.wall_bookshelf || tex.wall_house || tex.wall_stone; tex.wall_libpanel = tex.wall_libpanel || tex.wall_bookshelf; tex.wall_ironplate = tex.wall_ironplate || tex.wall_stone; tex.wall_furnace = tex.wall_furnace || tex.wall_ironplate;
  tex.floor_carpet = tex.floor_carpet || tex.floor_wood_planks; tex.floor_irongrate = tex.floor_irongrate || tex.floor_stone; tex.floor_ink = tex.floor_ink || tex.floor_water; tex.floor_molten = tex.floor_molten || tex.floor_lava; tex.floor_vent = tex.floor_vent || tex.floor_irongrate; tex.floor_conveyor = tex.floor_conveyor || tex.floor_irongrate;
  tex.wall_mycel = tex.wall_mycel || tex.wall_cave; tex.wall_mushroomcap = tex.wall_mushroomcap || tex.wall_mycel; tex.wall_marble = tex.wall_marble || tex.wall_stone; tex.wall_mirror = tex.wall_mirror || tex.wall_marble;
  tex.floor_moss = tex.floor_moss || tex.floor_cave; tex.floor_marble = tex.floor_marble || tex.floor_tiles_blue; tex.floor_bouncepad = tex.floor_bouncepad || tex.floor_moss; tex.floor_sporepool = tex.floor_sporepool || tex.floor_swamp || tex.floor_moss; tex.floor_teleport = tex.floor_teleport || tex.floor_marble;
  tex.wall_brass = tex.wall_brass || tex.wall_stone; tex.wall_gear = tex.wall_gear || tex.wall_brass; tex.wall_gear2 = tex.wall_gear2 || tex.wall_gear; tex.wall_cloudstone = tex.wall_cloudstone || tex.wall_stone; tex.wall_stormwall = tex.wall_stormwall || tex.wall_cloudstone;
  tex.floor_brass = tex.floor_brass || tex.floor_tiles_blue; tex.floor_cloud = tex.floor_cloud || tex.floor_stone_pattern; tex.floor_sawtrack = tex.floor_sawtrack || tex.floor_brass; tex.floor_void = tex.floor_void || tex.floor_pit || tex.floor_stone; tex.floor_wind = tex.floor_wind || tex.floor_cloud;
  tex.floor_sand = tex.floor_sand || tex.floor_gravel; tex.floor_gold_tiles = tex.floor_gold_tiles || tex.floor_tiles_blue; tex.floor_quicksand = tex.floor_quicksand || tex.floor_mud; tex.floor_boss_pharaoh = tex.floor_boss_pharaoh || tex.floor_gold_tiles;
  tex.floor_pit = tex.floor_pit || tex.floor_mud; tex.floor_crack = tex.floor_crack || tex.floor_stone;
  tex.wall_boss_frost = tex.wall_boss_frost || tex.wall_frost; tex.floor_boss_frost = tex.floor_boss_frost || tex.floor_snow;
  tex.floor_lava = tex.floor_lava || tex.floor_stone; tex.floor_lava2 = tex.floor_lava2 || tex.floor_lava; tex.floor_ice = tex.floor_ice || tex.floor_tiles_blue;
  setStatus('Laddar fiender…');
  for (const [k, d] of Object.entries(ENEMY_DEFS)) {
    if (d.frames) { enemyFrames[k] = enemyFrames[d.frames]; continue; }
    if (NEW_ENEMIES.includes(k)) { try { await loadEnemySheet(k, d); } catch (e) { d.size = 1; d.fw = 32; } continue; } // nya fiender är valfria
    const sets = {};
    for (const [st, file] of [['idle', 'idle'], ['move', d.move], ['attack', 'attack'], ['pain', 'take_damage'], ['death', 'death']]) {
      const img = await load(`${A}gfx/enemies-${d.sheet}_${file}.png`);
      sets[st] = strip(img, Math.floor(img.width / (d.fw || 32)));
    }
    enemyFrames[k] = sets;
  }
  for (const k of NEW_ENEMIES) if (!enemyFrames[k]) enemyFrames[k] = enemyFrames.S; // saknas bilderna: skelettets bilder
  // bossen: vingad demon (Gothicvania, CC0), förminskad för snabbare sprite-ritning
  enemyFrames.B = {
    idle: strip(await load(A + 'gfx/boss_idle.png'), 6, 0.5),
    attack: strip(await load(A + 'gfx/boss_attack.png'), 18, 0.5),
    breath: strip(await load(A + 'gfx/boss_breath.png'), 18, 0.5),
  };
  // de andra bossarna (tools/boss-sprites/prep.py): [animation, antal rutor]
  const BOSS_SHEETS = { beast: [['idle', 6], ['breath', 4], ['burn', 4], ['pillar', 2]], nightmare: [['idle', 4], ['run', 3]],
    ogre: [['idle', 4], ['walk', 6], ['attack', 7]], ghost: [['idle', 7], ['chase', 4], ['shriek', 4], ['vanish', 7], ['appear', 6]] };
  bossFx.frost = {}; // isdraken: valfria bilder, 124 px breda rutor
  for (const a of ['idle', 'attack', 'cast', 'hurt', 'death']) { try { const img = await load(`${A}gfx/boss_frost_${a}.png`); bossFx.frost[a] = strip(img, Math.max(1, Math.round(img.width / (img.height === 59 ? 124 : img.height)))); } catch (e) { /* saknas */ } }
  for (const id of ['crystalqueen', 'leviathan', 'clockmaker', 'thunderbird', 'mycelmother', 'mirrorking', 'librarian', 'colossus', 'cardinal', 'queenbee', 'gardener', 'sandman', 'captain', 'alchemist', 'ringmaster', 'serpent', 'foreman', 'starseer', 'ratking', 'sphinx', 'executioner', 'tidepriest', 'bathmaster', 'pyrelord', 'butcher', 'warlord', 'mayor', 'glassmaster']) { bossFx[id] = {}; for (const a of ['idle', 'attack', 'cast', 'hurt', 'death', 'submerge', 'dive']) { try { const img = await load(`${A}gfx/boss_${id}_${a}.png`); bossFx[id][a] = strip(img, Math.max(1, Math.round(img.width / img.height))); } catch (e) { /* valfri */ } }
    if (!bossFx[id].idle) delete bossFx[id]; else for (const a of ['attack', 'cast', 'hurt', 'submerge', 'dive']) bossFx[id][a] = bossFx[id][a] || bossFx[id].idle; }
  bossFx.pharaoh = {}; // faraonen: valfria bilder
  for (const a of ['idle', 'attack', 'cast', 'hurt', 'death']) { try { const img = await load(`${A}gfx/boss_pharaoh_${a}.png`); bossFx.pharaoh[a] = strip(img, Math.max(1, Math.round(img.width / img.height))); } catch (e) { /* saknas */ } }
  if (!bossFx.pharaoh.idle) delete bossFx.pharaoh; else { bossFx.pharaoh.attack = bossFx.pharaoh.attack || bossFx.pharaoh.idle; bossFx.pharaoh.cast = bossFx.pharaoh.cast || bossFx.pharaoh.idle; }
  bossFx.monk = bossFx.pharaoh || bossFx.crystalqueen; // den förste munken lånar faraonens gestalt (tonad violett)
  bossFx.flame = {}; // eldkungen: valfria bilder (rutornas bredd = bildens höjd om inget annat anges)
  for (const a of ['idle', 'attack', 'cast', 'hurt', 'death']) { try { const img = await load(`${A}gfx/boss_flame_${a}.png`); bossFx.flame[a] = strip(img, Math.max(1, Math.round(img.width / (BOSS_FW.flame || img.height)))); } catch (e) { /* saknas */ } }
  if (!bossFx.flame.idle) delete bossFx.flame; else { bossFx.flame.attack = bossFx.flame.attack || bossFx.flame.idle; bossFx.flame.cast = bossFx.flame.cast || bossFx.flame.idle; }
  if (!bossFx.frost.idle) delete bossFx.frost; else { bossFx.frost.attack = bossFx.frost.attack || bossFx.frost.idle; bossFx.frost.cast = bossFx.frost.cast || bossFx.frost.idle; }
  for (const [id, anims] of Object.entries(BOSS_SHEETS)) {
    bossFx[id] = {};
    for (const [a, n] of anims) bossFx[id][a] = strip(await load(`${A}gfx/boss_${id}_${a}.png`), n);
  }
  setStatus('Laddar vapen…');
  for (const n of WEAPONS.map(w => w.id)) {
    if (['axe', 'flamer', 'launcher', 'nailgun', 'staff', 'bow', 'knives', 'hammer', 'musket', 'harpoon', 'boomerang', 'prism', 'sawlauncher', 'windgun', 'spear', 'sporelauncher', 'mirrorshield', 'whip', 'runebook', 'steamcannon', 'censer', 'hivelauncher', 'shears', 'dreamstaff', 'chaincannon', 'acidsprayer', 'pinthrower', 'blowgun', 'pickaxe', 'starlance', 'scimitar', 'trapthrower', 'flail', 'blunderbuss', 'trident', 'brimstone', 'hookchain', 'bombard'].includes(n)) { try { wimg[n] = await load(`${A}gfx/fp_${n}.png`); spr['pick_' + n] = pixels(await load(`${A}gfx/pick_${n}.png`)); } catch (e) { wimg[n] = wimg.pistol; spr['pick_' + n] = spr.pick_pistol; } continue; } // nya vapen: valfria bilder
    wimg[n] = await load(`${A}gfx/fp_${n}.png`);
    spr['pick_' + n] = pixels(await load(`${A}gfx/pick_${n}.png`));
  }
  for (const n of ['shotgun', 'rifle', 'pistol', 'staff', 'axe', 'bow']) { try { wimg[n + '_legend'] = await load(`${A}gfx/fp_${n}_legend.png`); spr['pick_' + n + '_legend'] = pixels(await load(`${A}gfx/pick_${n}_legend.png`)); } catch (e) { /* valfri */ } }
  wimg.flash = await load(A + 'gfx/MuzzleFlash.png');
  spr.health = pixels(await load(A + 'gfx/health.png'));
  spr.armor = pixels(await load(A + 'gfx/armor.png'));
  spr.ammo = pixels(await load(A + 'gfx/ammo.png'));
  fx.fire = strip(await load(A + 'gfx/fire.png'), 16);
  fx.fireball = strip(await load(A + 'gfx/fireball.png'), 8);
  fx.hit = strip(await load(A + 'gfx/hit.png'), 8);
  fx.blood = strip(await load(A + 'gfx/blood.png'), 3);
  fx.pots = strip(await load(A + 'gfx/pots.png'), 4);
  fx.shards = grid(await load(A + 'gfx/shards.png'), 12, 12, 6, 4);
  fx.coin = strip(await load(A + 'gfx/coin.png'), 4);
  fx.chest = strip(await load(A + 'gfx/chest.png'), 4);
  fx.chestOpen = strip(await load(A + 'gfx/chest_open.png'), 4);
  fx.merchant = strip(await load(A + 'gfx/merchant.png'), 6);
  fx.portal = strip(await load(A + 'gfx/portal.png'), 8);
  // utomhus: natthimmel, träd och gravstenar
  spr.sky = pixels(await load(A + 'gfx/sky_night.png'));
  for (const b of ['battlefield', 'desert', 'purgatory', 'sky', 'volcano', 'jungle', 'harbor']) { try { spr['sky_' + b] = pixels(await load(`${A}gfx/sky_${b}.png`)); } catch (e) { /* valfri: annars natthimlen */ } } // egna himlar per biom i gfx/sky_<biom>.png (512x96, 360° vågrätt)
  spr.cardback = pixels(await load(A + 'cards/back.png'), 24, 24);
  for (const [k, f] of [['grenade', 'item_grenade'], ['key', 'item_key'], ['scroll', 'item_map'], ['ammo_small', 'item_ammo_small'], ['ammo_big', 'item_ammo_big'], ['moon', 'moon'], ['clouds', 'clouds']]) {
    try { spr[k] = pixels(await load(`${A}gfx/${f}.png`)); } catch (e) { /* valfri */ }
  }
  fx.trees = [pixels(await load(A + 'gfx/tree_1.png')), pixels(await load(A + 'gfx/tree_2.png'))];
  fx.graves = strip(await load(A + 'gfx/grave.png'), 3);
  fx.props = {}; // föremål i rummen (tools/props/make.py)
  try { fx.props.boulder = strip(await load(A + 'gfx/prop_boulder.png'), 4); } catch (e) { /* valfri */ }
  for (const [k, n] of [['sawblade', 4], ['timebubble', 2], ['windgust', 4], ['bouncecap', 3], ['teleportfx', 4], ['sporecloud', 3], ['inkblot', 2], ['steamjet', 4]]) { try { fx.props[k] = strip(await load(`${A}gfx/prop_${k}.png`), n); } catch (e) { /* valfri */ } }
  for (const d of Object.values(PROP_DEFS)) if (!fx.props[d.img]) { try { fx.props[d.img] = strip(await load(`${A}gfx/${d.src || 'prop_' + d.img}.png`), d.n || 1); } catch (e) { /* valfri */ } }
  const sq = img => strip(img, Math.max(1, Math.round(img.width / img.height))); // kvadratiska rutor
  fx.pets = {}; // följeslagarna (valfria; saknas de används fladdermus, irrbloss och isvarg)
  for (const id of ['raven', 'lantern', 'pup', 'firefly', 'minigolem', 'owl']) {
    const set = {};
    for (const [k, f] of [['idle', ''], ['idle', '_idle'], ['move', '_movement'], ['attack', '_attack']]) if (!set[k] || f) { try { set[k] = sq(await load(`${A}gfx/pet_${id}${f}.png`)); } catch (e) { /* valfri */ } }
    if (set.idle) fx.pets[id] = set;
  }
  for (const k of ['rune_fire', 'rune_ice', 'rune_poison', 'rune_storm', 'rune_blood', 'rune_echo', 'ab_blink', 'ab_slowmo', 'ab_bubble', 'ab_summon', 'ab_quake']) { try { const im = await load(`${A}gfx/${k}.png`); spr[k] = pixels(im); hudImg[k] = im; } catch (e) { /* valfri */ } }
  try { spr.meat = pixels(await load(`${A}gfx/item_meat.png`)); } catch (e) { /* valfri */ }
  for (const [k, f] of [['page', 'item_page'], ['battery', 'item_battery'], ['stone', 'item_stone'], ['tome', 'item_tome'], ['gear', 'item_gear'], ['feather', 'item_feather'], ['sporesack', 'item_sporesack'], ['inkflask', 'item_inkflask'], ['beehive', 'item_beehive'], ['dreamflask', 'item_dreamflask'], ['chaincrate', 'item_chaincrate'], ['acidflask', 'item_acidflask'], ['pinbox', 'item_pinbox'], ['dartquiver', 'item_dartquiver'], ['stardust', 'item_stardust'], ['traps', 'item_trapbox'], ['scrap', 'item_scrap'], ['brimstone', 'item_brimstone'], ['cannonballs', 'item_cannonballs']]) { try { spr[k] = pixels(await load(`${A}gfx/${f}.png`)); } catch (e) { /* valfri */ } }
  spr.chaincrate = spr.chaincrate || spr.ammo; spr.acidflask = spr.acidflask || spr.ammo; spr.pinbox = spr.pinbox || spr.ammo; spr.dartquiver = spr.dartquiver || spr.ammo; spr.stardust = spr.stardust || spr.ammo; spr.traps = spr.traps || spr.ammo; if (!spr.scrap) { try { spr.scrap = pixels(await load(`${A}gfx/pick_scrap.png`)); } catch (e) { spr.scrap = spr.ammo; } } spr.brimstone = spr.brimstone || spr.ammo; spr.cannonballs = spr.cannonballs || spr.ammo; try { fx.props.beartrap = strip(await load(`${A}gfx/prop_beartrap.png`), 2); } catch (e) { /* valfri */ } /* version 19: stjärnstoftsflaskan */ // version 18: kägellådan och pilkogret // version 17: utan bild blir kulkistan och syraflaskan en ammolåda
  for (const k of ['icon_eye', 'icon_ear', 'icon_air', 'icon_xp', 'icon_wind', 'icon_time', 'icon_spore', 'icon_ink', 'icon_bless', 'icon_honey', 'icon_mist', 'icon_thorns', 'icon_acid', 'icon_gold2', 'icon_spotlight', 'icon_poison2', 'icon_steal', 'icon_gas', 'icon_lowgrav', 'icon_sludge', 'icon_storm', 'icon_leech']) { try { hudImg[k] = await load(`${A}gfx/${k}.png`); } catch (e) { /* valfri */ } }
  for (const k of ['potion_heal', 'potion_rage', 'potion_ghost', 'potion_speed', 'potion_ice', 'potion_unknown']) { try { const im = await load(`${A}gfx/${k}.png`); spr[k] = pixels(im); hudImg[k] = im; } catch (e) { /* valfri */ } }
  try { fx.crateBits = strip(await load(A + 'gfx/prop_crate_broken.png'), 4); } catch (e) { fx.crateBits = null; }
  fx.parts = {}; // biompartiklar (tools/props/make.py); saknas en används träffgnistan
  for (const [n, k] of [['web', 1], ['page', 2], ['ink2', 2], ['steam', 3], ['spore2', 2], ['glassshard', 2], ['whip', 1], ['illusion', 2], ['chain', 1], ['root', 2], ['tongue', 1], ['legend', 2], ['dirt', 2], ['gear', 2], ['spark2', 2], ['feather', 2], ['wind', 3], ['lightning2', 2], ['cloud', 2], ['bubble', 2], ['shard', 2], ['splash_big', 4], ['prismbeam', 1], ['note', 2], ['note2', 2], ['smoke3', 3], ['honey', 2], ['petal', 2], ['dreamsand', 2], ['ink', 2], ['harpoonrope', 1], ['knife', 1], ['bandage', 2], ['sand', 2], ['smoke2', 4], ['beam', 1], ['dust_mote', 1], ['nail', 1], ['arrow', 1], ['lightning', 4], ['ashfall', 2], ['lavadrop', 2], ['heat', 1], ['snow', 2], ['footprint', 1], ['breath', 2], ['icicle', 1], ['flame', 4], ['blood_trail', 2], ['eye', 1], ['leaf', 4], ['firefly', 2], ['drop', 1], ['rain', 1], ['fog', 1], ['bat', 4], ['ember', 2], ['dust', 1], ['wisp', 4], ['shell', 1], ['blood_pool', 3],
    ['gib', 4], ['spore', 2], ['webshot', 1], ['scorch', 1], ['hole', 2], ['ash', 2], ['smoke', 4], ['ice', 3], ['gas', 2], ['skull', 2], ['log', 2], ['rock', 1], ['shadow', 1], ['zzz', 1], ['star', 1], ['meteor', 2], ['acid', 2], ['chainball', 2], ['bubble2', 2], ['feather2', 2], ['confetti', 3], ['pin', 2], ['dart', 1], ['leaf2', 2], ['popcorn', 2], ['laser', 1], ['coal', 2], ['stardust', 3], ['meteor2', 2], ['gasbubble', 2], ['sludge', 2], ['sand2', 2], ['steam2', 2], ['steam3', 2], ['ash2', 2], ['brimstone', 2], ['flies', 2], ['ghostwisp', 2], ['mud', 2]]) {
    try { fx.parts[n] = strip(await load(`${A}gfx/part_${n}.png`), k); } catch (e) { /* valfri */ }
  }
  await v30Load(); // version 30 (SPEL): Ruinstadens och Glasbrukets texturer, partiklar och himmel
  await efxLoad(); // version 25: förrenderade Effekseer-strippar (valfria)
  await efx2Load(); // version 25.1: skärmeffekterna portal och helning (valfria)
  try { await document.fonts.load('8px "PressStart2P"'); } catch (e) { /* reservtypsnitt */ }
}

