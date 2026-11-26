'use strict';
// KRYPTA – roguelike-FPS (raycaster i Doom/Wolfenstein-anda).
// Varje runda: genererade våningar (Gen), kort som ger bonusar (Cards/CardUI), guld, butik, elitfiender
// och en boss på sista våningen. Döden avslutar rundan; själar ger upplåsningar till nästa.
(() => {
const SW = 320, H = 200, HUD_H = 0, SVH = H - HUD_H, SHOR = SVH >> 1; // skärmens mått (fasta)
let W = SW, VH = SVH, HORIZON = SHOR; // världsritningen byter till den större bufferten när man tittar upp/ned (lkBegin/lkEnd)
const WOY = SHOR - 83; // vapnen sänks lika mycket som horisonten
const PSC = 166; // projektionens skala (den gamla vyhöjden): vyn fyller hela höjden utan att väggarna sträcks
// Titta upp/ned utan förvrängning: världen ritas med vågrät kamera i en större buffert och vrids sedan till skärmen (en homografi per rad, lkProject).
const LK_MAX = 0.61, LK_TOT = 0.68; // största blick upp/ned (35°) och största totala vinkel med rekyl och dödskamera
function lkDims(th) { // buffertens bredd/höjd och horisontens rad som rymmer hela skärmen vid vinkeln th
  const c = Math.cos(th), s = Math.sin(th), y0 = -SHOR / PSC, y1 = (SVH - 1 - SHOR) / PSC, z0 = y0 * s + c, z1 = y1 * s + c;
  const hor = Math.ceil(-PSC * (y0 * c - s) / z0) + 2;
  return { TW: 2 * Math.ceil(SW / 2 / Math.min(z0, z1) + 2), TH: hor + Math.ceil(PSC * (y1 * c - s) / z1) + 3, hor };
}
const LK_W = Math.max(lkDims(LK_TOT).TW, lkDims(-LK_TOT).TW), LK_H = Math.max(lkDims(LK_TOT).TH, lkDims(-LK_TOT).TH);
const HUD_CELLS = [0, 60, 112, 198, 266]; // statuslistens fält: hälsa, skydd, ammo, vapen, våning
let BASE_PLANE = 0.75; // sätts från synfältet (FOV) i inställningarna
const applyFov = () => { BASE_PLANE = Math.tan(clamp(settings.fov, 60, 100) * Math.PI / 360); };
const FLOORS = 5; // vanliga våningar per varv; våning FLOORS + 1 är bossen
// efter bossen kan man gå djupare: varv 2 är våning 7-12 med en starkare boss på 12, och så vidare
const isBossDepth = d => d % (FLOORS + 1) === 0;
const cycleOf = d => Math.floor((d - 1) / (FLOORS + 1));
const cyclePos = d => (d - 1) % (FLOORS + 1) + 1;
const canvas = document.getElementById('screen');
const ctx = canvas.getContext('2d');
canvas.width = SW; canvas.height = H;
ctx.imageSmoothingEnabled = false;
const frame = ctx.createImageData(SW, SVH);
const spx = new Uint32Array(frame.data.buffer); // skärmens bildpunkter
const tpx = new Uint32Array(LK_W * LK_H); // den större bufferten för upp/ned-blicken
let px = spx; // där världen ritas just nu (spx, eller tpx under lkBegin–lkEnd)
const zbuf = new Float32Array(LK_W);
const params = new URLSearchParams(location.search);
const TAU = Math.PI * 2;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const rnd = (a, b) => a + Math.random() * (b - a);

// ---------- Inställningar, profil och sparning (localStorage kan saknas) ----------
const store = {
  get(k, def) { try { const v = localStorage.getItem('krypta.' + k); return v ? JSON.parse(v) : def; } catch (e) { return def; } },
  set(k, v) { try { localStorage.setItem('krypta.' + k, JSON.stringify(v)); } catch (e) { /* ingen lagring */ } },
  del(k) { try { localStorage.removeItem('krypta.' + k); } catch (e) { /* ingen lagring */ } },
};
const DEVICE = (() => { try { return matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window ? 'mobil' : 'dator'; } catch (e) { return 'dator'; } })(); // inställningar sparas per enhetstyp
const settings = Object.assign({ sens: 1, vol: 0.8, muted: false, diff: 1, fov: 74, gamma: 1, shake: 1, xstyle: 'kors', xcolor: '', fps: false, lowfx: false, bob: true,
  smartAI: true, // version 24: fiende-AI med attackpoletter, skydd, trupp och barks (AI24)
  voices: true, // version 25.1: röster till fiendernas utrop (FIX251)
  parryTell: true, // version 26B: pareringsmarkeringen (PARERINGSMARKERING)
  vibrate: true, lefty: false, btnScale: 1, map: 1, mouseLook: DEVICE !== 'mobil', invertY: false }, store.get('settings.' + DEVICE, null) || store.get('settings', {}));
if (params.has('diff')) settings.diff = clamp(+params.get('diff'), 0, 4);
const saveSettings = () => { store.set('settings.' + DEVICE, settings); store.set('settings', settings); };
applyFov();
const profile = Object.assign({ souls: 0, unlocked: [], runs: 0, wins: 0, bestDepth: 0, bestScore: 0, history: [] }, store.get('profile', {}));
const saveProfile = () => store.set('profile', profile);
// ---------- Prestationer ----------
const ACH = [
  ['first', 'FÖRSTA STEGET', 'KLARA EN VÅNING', p => p.bestDepth >= 2],
  ['cycle', 'NERÅT', 'NÅ VÅNING 6', p => p.bestDepth >= 6],
  ['deep', 'DJUPET', 'NÅ VÅNING 12', p => p.bestDepth >= 12],
  ['win', 'KRYPTANS HERRE', 'VINN EN RUNDA', p => p.wins >= 1],
  ['nightmare', 'MARDRÖMMEN', 'VINN PÅ MARDRÖM', p => p.nightmareWin],
  ['k100', 'SLAKTARE', 'DÖDA 100 FIENDER TOTALT', p => (p.kills || 0) >= 100],
  ['k1000', 'LIKSTRÖ', 'DÖDA 1000 FIENDER TOTALT', p => (p.kills || 0) >= 1000],
  ['boss1', 'BOSSJÄGARE', 'BESEGRA EN BOSS', p => Object.keys(p.bossWins || {}).length >= 1],
  ['bossall', 'ALLA HUVUDEN', 'BESEGRA ALLA SEX BOSSAR', p => Object.keys(p.bossWins || {}).length >= BOSS_IDS.length, p => [Object.keys(p.bossWins || {}).length, BOSS_IDS.length]],
  ['guard', 'VÄKTARDRÅPARE', 'BESEGRA EN VÄKTARE', p => (p.guardians || 0) >= 1],
  ['rich', 'GULDFEBER', 'HA 500 GULD SAMTIDIGT', (p, r) => r && r.gold >= 500],
  ['deck', 'SAMLAREN', 'HA 15 KORT I EN RUNDA', (p, r) => r && r.owned.length >= 15],
  ['pact', 'PAKTEN', 'SLUT EN VAPENPAKT', (p, r) => r && r.pact],
  ['secret', 'SPÅRHUND', 'HITTA 10 HEMLIGHETER TOTALT', p => (p.secrets || 0) >= 10],
  ['fast', 'BLIXTEN', 'KLARA EN VÅNING PÅ UNDER 60 S', (p, r) => r && r.fast],
  ['untouched', 'ORÖRBAR', 'KLARA EN VÅNING UTAN ATT TA SKADA', (p, r) => r && r.untouched],
  ['multi', 'MASSAKER', 'DÖDA 5 FIENDER I SAMMA SALVA', () => P.multi >= 5],
  ['altar', 'OFFRET', 'KÖP EN UPPGRADERING VID SJÄLAALTARET', p => Object.values(p.meta || {}).some(v => v > 0)],
  ['arsenal', 'ARSENALEN', 'BÄR 6 VAPEN SAMTIDIGT', () => P.has.filter(Boolean).length >= 6],
  ['daily', 'DAGBOKEN', 'SPELA EN DAGENS RUNDA', p => p.history.some(h => h.daily)],
  ['jump', 'HOPPETOSSA', 'HOPPA 100 GÅNGER', p => (p.jumps || 0) >= 100, p => [p.jumps || 0, 100]],
  ['dash', 'RUSAREN', 'RUSA 50 GÅNGER', p => (p.dashes || 0) >= 50, p => [p.dashes || 0, 50]],
  ['gren', 'GRANATKASTAREN', 'KASTA 25 GRANATER', p => (p.grenadesThrown || 0) >= 25, p => [p.grenadesThrown || 0, 25]],
  ['gib', 'SLAKTHUSET', 'SPRÄNG 50 FIENDER I BITAR', p => (p.gibs || 0) >= 50, p => [p.gibs || 0, 50]],
  ['combo10', 'KOMBOKUNGEN', 'NÅ KOMBO x10', (p, r) => r && (r.bestCombo || 0) >= 10],
  ['champ', 'GULDJÄGAREN', 'DÖDA 3 CHAMPIONS', p => (p.champions || 0) >= 3, p => [p.champions || 0, 3]],
  ['smith', 'SMEDEN', 'SMID ETT VAPEN TILL NIVÅ 3', (p, r) => r && Object.values(r.wlvl || {}).some(v => v >= 3)],
  ['freed', 'BEFRIAREN', 'BEFRIA 5 FÅNGAR', p => (p.freed || 0) >= 5, p => [p.freed || 0, 5]],
  ['challenge', 'UTMANAREN', 'KLARA 3 UTMANINGAR', p => (p.challenges || 0) >= 3, p => [p.challenges || 0, 3]],
  ['goldroom', 'GULDKAMMAREN', 'HITTA GULDKAMMAREN', p => (p.goldRooms || 0) >= 1],
  ['rush', 'BOSSRUSHEN', 'VINN EN BOSSRUSH', p => (p.rushWins || 0) >= 1],
  ['asc1', 'UPPSTIGEN', 'VINN PÅ UPPSTIGNING 1', p => (p.ascMax || 0) >= 2],
  ['swamp', 'TRÄSKVANDRAREN', 'KLARA EN VÅNING I TRÄSKET', p => (p.swampFloors || 0) >= 1],
  ['seen100', 'KORTKÄNNAREN', 'SE 100 OLIKA KORT', p => (p.cardsSeen || []).length >= 100, p => [(p.cardsSeen || []).length, 100]],
  ['set', 'SETMÄSTAREN', 'FULLBORDA ETT KORTSET', (p, r) => r && Cards.setProgress && Cards.setProgress(r.owned).some(x => x.active)],
  ['unlock', 'NYCKELBÄRAREN', 'ÖPPNA 5 LÅSTA DÖRRAR ELLER KISTOR', p => (p.unlocks || 0) >= 5, p => [p.unlocks || 0, 5]],
  ['lever', 'SPAKDRAGAREN', 'DRA I EN SPAK', p => (p.levers || 0) >= 1],
  ['wall', 'RIVAREN', 'SPRÄNG EN SPRUCKEN VÄGG', p => (p.walls || 0) >= 1],
  ['bounty', 'PRISJÄGAREN', 'DÖDA 5 MÄRKTA ELITER', p => (p.bounties || 0) >= 5, p => [p.bounties || 0, 5]],
  ['ghost', 'ANDEFRID', 'HJÄLP SPÖKET HITTA SINA BEN', p => (p.ghosts || 0) >= 1],
  ['classes', 'MÅNGSYSSLAREN', 'LÅS UPP ALLA KLASSER', p => Object.keys(CLASSES).every(c => !CLASSES[c].cost || (p.classes || []).includes(c))],
  ['k5000', 'DÖDENS HANDLANGARE', 'DÖDA 5000 FIENDER TOTALT', p => (p.kills || 0) >= 5000, p => [p.kills || 0, 5000]],
  ['deep3', 'AVGRUNDEN', 'NÅ VARV 3', p => p.bestDepth >= 13],
  ['nohit3', 'SKUGGAN', 'KLARA 3 VÅNINGAR UTAN SKADA I EN RUNDA', (p, r) => r && (r.untouched || 0) >= 3],
  ['souls', 'SJÄLASAMLAREN', 'HA 500 SJÄLAR SAMTIDIGT', p => p.souls >= 500],
  ['events', 'ÖDETS VÄDER', 'UPPLEV 5 VÅNINGSHÄNDELSER', p => (p.events || 0) >= 5, p => [p.events || 0, 5]],
  ['fortune', 'SPÅDD', 'BESÖK SPÅALTARET', p => (p.fortunes || 0) >= 1],
  ['mimic5', 'MIMICJÄGAREN', 'DÖDA 5 MIMICS', p => ((p.bestiary || {}).Q || 0) >= 5, p => [(p.bestiary || {}).Q || 0, 5]],
  ['sneak', 'LÖNNMÖRDAREN', 'GÖR 25 BAKHÅLL', p => (p.sneaks || 0) >= 25, p => [p.sneaks || 0, 25]],
  ['speed', 'SNABBAST', 'VINN PÅ UNDER 30 MINUTER', p => (p.fastestWin || 1e9) < 1800],
  // version 5
  ['frostboss', 'ISHJÄRTAT', 'BESEGRA ISDRAKEN', p => !!(p.bossWins || {}).frost],
  ['pet', 'FLOCKLEDAREN', 'FÅ EN FÖLJESLAGARE', p => (p.petsGot || 0) >= 1],
  ['petlv', 'TRÄNAREN', 'FÅ EN FÖLJESLAGARE TILL NIVÅ 5', () => petLv() >= 5],
  ['potion10', 'LÄRLINGEN', 'DRICK 10 DRYCKER', p => (p.potions_n || 0) >= 10, p => [p.potions_n || 0, 10]],
  ['potall', 'DRYCKESKÄNNAREN', 'LÄR DIG ALLA FEM DRYCKER', p => (p.potions || []).length >= 5, p => [(p.potions || []).length, 5]],
  ['blend', 'BLANDAREN', 'LÅT ALKEMISTEN BLANDA EN DRYCK', p => (p.blends || 0) >= 1],
  ['bless', 'VÄLSIGNAD', 'FÅ PRÄSTENS VÄLSIGNELSE', p => (p.blessings || 0) >= 1],
  ['curselift', 'RENAD', 'LÅT PRÄSTEN LYFTA EN FÖRBANNELSE', p => (p.cursesLifted || 0) >= 1],
  ['ally10', 'DE DÖDAS HÄR', 'FÅ 10 ALLIERADE', p => (p.allies || 0) >= 10, p => [p.allies || 0, 10]],
  ['fuse', 'SMÄLTDEGELN', 'SMÄLT SAMMAN TVÅ KORT', p => (p.fusions || 0) >= 1],
  ['head50', 'HUVUDJÄGAREN', 'GÖR 50 HUVUDTRÄFFAR', p => (p.headshots || 0) >= 50, p => [p.headshots || 0, 50]],
  ['frostfloor', 'VINTERVANDRAREN', 'KLARA EN VÅNING I FROSTFÄSTET', p => ((p.biomeFloors || {}).frost || 0) >= 1],
  ['hardchal', 'DEN SVÅRA VÄGEN', 'KLARA EN SVÅR UTMANING', p => (p.hardChallenges || 0) >= 1],
  ['routes', 'VÄGVÄLJAREN', 'VÄLJ DEN SVÅRA VÄGEN 3 GÅNGER', p => (p.hardRoutes || 0) >= 3, p => [p.hardRoutes || 0, 3]],
  ['axe100', 'BÄRSÄRKEN', 'DÖDA 100 FIENDER MED YXAN', p => ((p.wkills || {}).axe || 0) >= 100, p => [(p.wkills || {}).axe || 0, 100]],
  ['flame100', 'MORDBRÄNNAREN', 'DÖDA 100 FIENDER MED ELDKASTAREN', p => ((p.wkills || {}).flamer || 0) >= 100, p => [(p.wkills || {}).flamer || 0, 100]],
  ['onehit', 'ETT ENDA SLAG', 'NÅ VÅNING 3 I LÄGET ETT SLAG', p => ((p.cmodeBest || {}).onehit || 0) >= 3],
  ['pistolwin', 'BARA PISTOLEN', 'VINN I LÄGET BARA PISTOL', p => !!(p.cmodeWins || {}).pistol],
  ['nocards', 'UTAN KORT', 'NÅ VÅNING 4 I LÄGET INGA KORT', p => ((p.cmodeBest || {}).nocards || 0) >= 4],
  ['days7', 'DEN TROGNA', 'SPELA SJU OLIKA DAGAR', p => (p.days || []).length >= 7, p => [(p.days || []).length, 7]],
  // version 6
  ['flameboss', 'ASKANS HERRE', 'BESEGRA ELDKUNGEN', p => !!(p.bossWins || {}).flame],
  ['nail200', 'SPIKMAKAREN', 'DÖDA 200 FIENDER MED SPIKGEVÄRET', p => ((p.wkills || {}).nailgun || 0) >= 200, p => [(p.wkills || {}).nailgun || 0, 200]],
  ['staff100', 'STORMKALLAREN', 'DÖDA 100 FIENDER MED BLIXTSTAVEN', p => ((p.wkills || {}).staff || 0) >= 100, p => [(p.wkills || {}).staff || 0, 100]],
  ['bow100', 'LÅNGSKYTTEN', 'DÖDA 100 FIENDER MED LÅNGBÅGEN', p => ((p.wkills || {}).bow || 0) >= 100, p => [(p.wkills || {}).bow || 0, 100]],
  ['rune', 'RUNRISTAREN', 'FÄST EN RUNA I ETT VAPEN', p => (p.runesSocketed || 0) >= 1],
  ['rune10', 'RUNMÄSTAREN', 'FÄST 10 RUNOR', p => (p.runesSocketed || 0) >= 10, p => [p.runesSocketed || 0, 10]],
  ['meal', 'MÅLTIDEN', 'LAGA MAT VID EN LÄGERELD', p => (p.meals || 0) >= 1],
  ['refine', 'FÖRÄDLAREN', 'FÖRÄDLA ETT KORT VID LÄGERELDEN', p => (p.refined || 0) >= 1],
  ['quests10', 'UPPDRAGSTAGAREN', 'KLARA 10 SIDOUPPDRAG', p => (p.quests || 0) >= 10, p => [p.quests || 0, 10]],
  ['secretfloor', 'DJUPARE ÄN DJUPT', 'HITTA EN HEMLIG VÅNING', p => (p.secretFloors || 0) >= 1],
  ['survival10', 'ÖVERLEVAREN', 'NÅ VÅG 10 I ÖVERLEVNAD', p => (p.survivalBest || 0) >= 10, p => [p.survivalBest || 0, 10]],
  ['survival25', 'DEN ODÖDLIGE', 'NÅ VÅG 25 I ÖVERLEVNAD', p => (p.survivalBest || 0) >= 25, p => [p.survivalBest || 0, 25]],
  ['volcanofloor', 'ASKVANDRAREN', 'KLARA EN VÅNING I VULKANEN', p => ((p.biomeFloors || {}).volcano || 0) >= 1],
  ['ability25', 'KRAFTEN', 'ANVÄND FÖRMÅGOR 25 GÅNGER', p => (p.abilities || 0) >= 25, p => [p.abilities || 0, 25]],
  ['ghost', 'SPÖKJÄGAREN', 'SLÅ DITT EGET SPÖKE PÅ EN VÅNING', p => (p.ghostBeaten || 0) >= 1],
  ['tutorial', 'LÄRLINGEN', 'KLARA INTRODUKTIONEN', p => !!p.tutDone],
  ['dq', 'DAGSVERKET', 'KLARA ALLA TRE DAGENS UPPDRAG', p => !!(p.dq && p.dq.list.every(q => q.done))],
  ['knight10', 'RIDDARDRÅPAREN', 'DÖDA 10 DÖDSRIDDARE', p => ((p.bestiary || {})['Ð'] || 0) >= 10, p => [(p.bestiary || {})['Ð'] || 0, 10]],
  ['worm10', 'MASKFÅNGAREN', 'DÖDA 10 LAVAMASKAR', p => ((p.bestiary || {})['Þ'] || 0) >= 10, p => [(p.bestiary || {})['Þ'] || 0, 10]],
  ['allbiomes', 'VÄRLDSVANDRAREN', 'KLARA EN VÅNING I ALLA NIO BIOMER', p => Object.keys(p.biomeFloors || {}).length >= 9, p => [Object.keys(p.biomeFloors || {}).length, 9]],
  // version 7
  ['pharaoh', 'GRAVENS HERRE', 'BESEGRA FARAONEN', p => !!(p.bossWins || {}).pharaoh],
  ['knives100', 'KNIVKASTAREN', 'DÖDA 100 FIENDER MED KASTKNIVARNA', p => ((p.wkills || {}).knives || 0) >= 100, p => [(p.wkills || {}).knives || 0, 100]],
  ['hammer100', 'SMEDENS ARM', 'DÖDA 100 FIENDER MED STRIDSHAMMAREN', p => ((p.wkills || {}).hammer || 0) >= 100, p => [(p.wkills || {}).hammer || 0, 100]],
  ['musket100', 'MUSKETÖREN', 'DÖDA 100 FIENDER MED MUSKÖTEN', p => ((p.wkills || {}).musket || 0) >= 100, p => [(p.wkills || {}).musket || 0, 100]],
  ['stealth25', 'SKUGGAN', 'DÖDA 25 FIENDER UTAN ATT BLI UPPTÄCKT', p => (p.stealthKills || 0) >= 25, p => [p.stealthKills || 0, 25]],
  ['stealth10run', 'OSEDD', 'DÖDA 10 FIENDER OSEDD I EN RUNDA', p => (p.bestStealth || 0) >= 10, p => [p.bestStealth || 0, 10]],
  ['pages10', 'SIDSAMLAREN', 'HITTA 10 KRÖNIKESIDOR', p => (p.pages || []).length >= 10, p => [(p.pages || []).length, 10]],
  ['pagesall', 'KRÖNIKÖREN', 'HITTA ALLA SIDOR I KRÖNIKAN', p => (p.pages || []).length >= CHRONICLE.length, p => [(p.pages || []).length, CHRONICLE.length]],
  ['gamble10', 'TURFÅGELN', 'VINN 10 GÅNGER HOS SPELAREN', p => (p.gambleWins || 0) >= 10, p => [p.gambleWins || 0, 10]],
  ['bank5', 'SPARAREN', 'SÄTT IN GULD I BANKEN 5 GÅNGER', p => (p.bankDeposits || 0) >= 5, p => [p.bankDeposits || 0, 5]],
  ['wanderer', 'VANDRARENS VÄN', 'FÖLJ VANDRAREN TILL SLUTET', p => (p.wanderSteps || 0) >= 3],
  ['thief', 'MÄSTERTJUVEN', 'STJÄL FRÅN KÖPMANNEN', p => (p.steals || 0) >= 1],
  ['haggle', 'KÖPSLAGAREN', 'PRUTA 5 GÅNGER', p => (p.haggles || 0) >= 5, p => [p.haggles || 0, 5]],
  ['sarco10', 'GRAVPLUNDRAREN', 'ÖPPNA 10 SARKOFAGER', p => (p.sarcophagi || 0) >= 10, p => [p.sarcophagi || 0, 10]],
  ['mastery5', 'VAPENMÄSTAREN', 'NÅ VANA NIVÅ 5 MED ETT VAPEN', p => (p.masteryMax || 0) >= 5],
  ['maze', 'LABYRINTENS BARN', 'TA DIG UT UR LABYRINTEN', p => (p.mazesWon || 0) >= 1],
  ['hunt', 'BOSSJÄGAREN', 'BESEGRA ALLA BOSSAR I BOSSJAKTEN', p => (p.huntsWon || 0) >= 1],
  ['dark', 'MÖRKRETS VANDRARE', 'NÅ VÅNING 4 I MÖRKERLÄGET', p => ((p.cmodeBest || {}).dark || 0) >= 4],
  ['combo2', 'DUBBEL UTMANING', 'NÅ VÅNING 3 MED TVÅ UTMANINGAR SAMTIDIGT', p => Object.entries(p.cmodeBest || {}).some(([k, v]) => k.includes('+') && v >= 3)],
  ['story', 'BERÄTTAREN', 'VINN EN RUNDA I BERÄTTELSELÄGET', p => !!p.storyWin],
  // version 8
  ['queen', 'SPEGELBRYTAREN', 'BESEGRA KRISTALLDROTTNINGEN', p => !!(p.bossWins || {}).crystalqueen],
  ['leviathan', 'HAVETS BETVINGARE', 'BESEGRA LEVIATAN', p => !!(p.bossWins || {}).leviathan],
  ['abyss10', 'NEDSTIGAREN', 'NÅ AVGRUND 10', p => (p.abyssBest || 0) >= 10, p => [p.abyssBest || 0, 10]],
  ['abyss25', 'AVGRUNDENS BARN', 'NÅ AVGRUND 25', p => (p.abyssBest || 0) >= 25, p => [p.abyssBest || 0, 25]],
  ['level10', 'MÄSTAREN', 'NÅ NIVÅ 10 I EN RUNDA', p => (p.bestLevel || 0) >= 10, p => [p.bestLevel || 0, 10]],
  ['talents50', 'TALANGFULL', 'VÄLJ 50 TALANGER', p => (p.talents || 0) >= 50, p => [p.talents || 0, 50]],
  ['harpoon50', 'VALFÅNGAREN', 'DÖDA 50 FIENDER MED HARPUNEN', p => ((p.wkills || {}).harpoon || 0) >= 50, p => [(p.wkills || {}).harpoon || 0, 50]],
  ['boomerang50', 'ÅTERVÄNDAREN', 'DÖDA 50 FIENDER MED BUMERANGEN', p => ((p.wkills || {}).boomerang || 0) >= 50, p => [(p.wkills || {}).boomerang || 0, 50]],
  ['prism100', 'LJUSBRYTAREN', 'DÖDA 100 FIENDER MED PRISMAN', p => ((p.wkills || {}).prism || 0) >= 100, p => [(p.wkills || {}).prism || 0, 100]],
  ['wrecks', 'VRAKPLUNDRAREN', 'ÖPPNA 10 VRAKKISTOR', p => (p.wrecks || 0) >= 10, p => [p.wrecks || 0, 10]],
  // version 9
  ['clockmaker', 'TIDENS BRYTARE', 'BESEGRA URMAKAREN', p => !!(p.bossWins || {}).clockmaker],
  ['thunderbird', 'STORMJÄGAREN', 'BESEGRA STORMFÅGELN', p => !!(p.bossWins || {}).thunderbird],
  ['void20', 'AVGRUNDSKASTAREN', 'KNUFFA 20 FIENDER I TOMRUMMET', p => (p.voidKills || 0) >= 20, p => [p.voidKills || 0, 20]],
  ['spear50', 'SPJUTKASTAREN', 'DÖDA 50 FIENDER MED SPJUTET', p => ((p.wkills || {}).spear || 0) >= 50, p => [(p.wkills || {}).spear || 0, 50]],
  ['saw100', 'SÅGVERKET', 'DÖDA 100 FIENDER MED SÅGBLADSKASTAREN', p => ((p.wkills || {}).sawlauncher || 0) >= 100, p => [(p.wkills || {}).sawlauncher || 0, 100]],
  ['finale', 'KRÖNIKANS SLUT', 'BESEGRA DEN FÖRSTE MUNKEN', p => (p.finaleWon || 0) >= 1],
  ['campaign3', 'BERÄTTELSENS MITT', 'KLARA TRE KAPITEL I KAMPANJEN', p => (p.campaign || 0) >= 3, p => [p.campaign || 0, 3]],
  ['campaign6', 'HJÄLTEN', 'KLARA HELA KAMPANJEN', p => (p.campaign || 0) >= 6, p => [p.campaign || 0, 6]],
  ['custom', 'BANBYGGAREN', 'KLARA EN EGEN BANA', p => (p.customWins || 0) >= 1],
  ['reflect25', 'SPEGEL, SPEGEL', 'STUDSA TILLBAKA 25 SKOTT MED SPEGELSKÖLDEN', p => (p.reflects || 0) >= 25, p => [p.reflects || 0, 25]],
  ['bounce30', 'SVAMPHOPPAREN', 'STUDSA 30 GÅNGER PÅ STUDSPLATTOR', p => (p.bounces || 0) >= 30, p => [p.bounces || 0, 30]],
  ['teleport20', 'HÄR OCH DÄR', 'ANVÄND TELEPORTRAR 20 GÅNGER', p => (p.teleports || 0) >= 20, p => [p.teleports || 0, 20]],
  ['angel10', 'BLINKA INTE', 'KROSSA TIO STENÄNGLAR', p => (p.bestiary || {})['ƫ'] >= 10, p => [(p.bestiary || {})['ƫ'] || 0, 10]],
  ['thorns50', 'TRÄDGÅRDSBRÄNNAREN', 'BRÄNN BORT 50 TAGGRANKOR', p => (p.thornsBurnt || 0) >= 50, p => [p.thornsBurnt || 0, 50]],
  ['captain', 'GÅ PÅ PLANKAN', 'BESEGRA SPÖKKAPTENEN', p => !!(p.bossWins || {}).captain],
  ['alchemist17', 'DEN SISTA BRYGDEN', 'BESEGRA ALKEMISTEN', p => !!(p.bossWins || {}).alchemist],
  ['cannon10', 'KANONJÄREN', 'AVFYRA TIO KANONER', p => (p.cannons || 0) >= 10, p => [p.cannons || 0, 10]],
  ['gold10', 'GULDMAKAREN', 'DÖDA TIO FÖRGYLLDA FIENDER', p => (p.goldKills || 0) >= 10, p => [p.goldKills || 0, 10]],
  ['foreman', 'SKIFTET ÄR SLUT', 'BESEGRA GRUVFÖRMANNEN', p => !!(p.bossWins || {}).foreman],
  ['starseer', 'STJÄRNORNA SLOCKNAR', 'BESEGRA STJÄRNSKÅDAREN', p => !!(p.bossWins || {}).starseer],
  ['ore20', 'MALMLETAREN', 'BRYT 20 MALMÅDROR', p => (p.ores || 0) >= 20, p => [p.ores || 0, 20]],
  ['starport20', 'STJÄRNRESENÄREN', 'RES GENOM 20 STJÄRNPORTAR', p => (p.starports || 0) >= 20, p => [p.starports || 0, 20]],
  ['ratking', 'KRONAN I KLOAKEN', 'BESEGRA RÅTTKUNGEN', p => !!(p.bossWins || {}).ratking],
  ['sphinx', 'GÅTAN ÄR LÖST', 'BESEGRA SFINXEN', p => !!(p.bossWins || {}).sphinx],
  ['executioner', 'YXAN HAR FALLIT', 'BESEGRA BÖDELN', p => !!(p.bossWins || {}).executioner],
  ['tidepriest', 'EBB OCH FLOD', 'BESEGRA TIDVATTENPRÄSTEN', p => !!(p.bossWins || {}).tidepriest],
  ['cage10', 'BURVAKTEN', 'SKJUT NED TIO HÄNGANDE BURAR', p => (p.cages || 0) >= 10, p => [p.cages || 0, 10]],
  ['barrel20', 'FISKHANDLAREN', 'SLÅ SÖNDER 20 FISKTUNNOR', p => (p.fishBarrels || 0) >= 20, p => [p.fishBarrels || 0, 20]],
  ['bathmaster', 'BADET ÄR STÄNGT', 'BESEGRA BADMÄSTAREN', p => !!(p.bossWins || {}).bathmaster],
  ['pyrelord', 'ELDEN SLOCKNAR', 'BESEGRA ELDFURSTEN', p => !!(p.bossWins || {}).pyrelord],
  ['trident20', 'FISKSPJUTET', 'FÅNGA 20 FIENDER MED DEN KASTADE TREUDDEN', p => (p.tridentThrowKills || 0) >= 20, p => [p.tridentThrowKills || 0, 20]],
  ['rune10', 'RUNSKRIVAREN', 'KLIV IN I TIO RUNCIRKLAR', p => (p.runeCircles || 0) >= 10, p => [p.runeCircles || 0, 10]],
  ['butcher', 'KVARNEN STANNAR', 'BESEGRA SLAKTMÄSTAREN', p => !!(p.bossWins || {}).butcher],
  ['warlord', 'SLAGET ÄR ÖVER', 'BESEGRA KRIGSHERREN', p => !!(p.bossWins || {}).warlord],
  ['hook20', 'KÖTTKROKEN', 'DRA IN 20 FIENDER MED SLAKTARKROKEN', p => (p.hookPulls || 0) >= 20, p => [p.hookPulls || 0, 20]],
  ['formation5', 'FORMATIONSBRYTAREN', 'BRYT FEM FORMATIONER AV SPÖKSOLDATER', p => (p.formations || 0) >= 5, p => [p.formations || 0, 5]],
  ['trap20', 'PÄLSJÄGAREN', 'FÅNGA 20 FIENDER I BJÖRNSAXAR', p => (p.trapSnaps || 0) >= 20, p => [p.trapSnaps || 0, 20]],
  ['sluice10', 'SLUSSVAKTEN', 'VRID SLUSSRATTEN TIO GÅNGER', p => (p.sluices || 0) >= 10, p => [p.sluices || 0, 10]],
  ['ringmaster', 'FÖRESTÄLLNINGEN ÄR SLUT', 'BESEGRA CIRKUSDIREKTÖREN', p => !!(p.bossWins || {}).ringmaster],
  ['serpent', 'ORMTÄMJAREN', 'BESEGRA DEN FJÄDRADE ORMEN', p => !!(p.bossWins || {}).serpent],
  ['balloon20', 'BALLONGSKYTTEN', 'SKJUT SÖNDER 20 BALLONGER', p => (p.balloons || 0) >= 20, p => [p.balloons || 0, 20]],
  ['idol5', 'TEMPELPLUNDRAREN', 'TA FEM GULDIDOLER', p => (p.idols || 0) >= 5, p => [p.idols || 0, 5]],
  ['bell5', 'KLOCKARE', 'RING I FEM KLOCKOR', p => (p.bells || 0) >= 5, p => [p.bells || 0, 5]],
  ['font10', 'HELGERÅNARE', 'SLÅ SÖNDER TIO BLODFUNTAR', p => (p.fonts || 0) >= 10, p => [p.fonts || 0, 10]],
  ['arena10', 'GLADIATORN', 'RENSA TIO ARENARUM', p => (p.arenas || 0) >= 10, p => [p.arenas || 0, 10]],
  ['lectern5', 'BOKMALEN', 'LÄS FEM PULPETER', p => (p.lecterns || 0) >= 5, p => [p.lecterns || 0, 5]],
  ['exec50', 'BÖDELN', 'AVRÄTTA 50 VACKLANDE FIENDER', p => (p.executions || 0) >= 50, p => [p.executions || 0, 50]],
  ['parry25', 'PARERINGSMÄSTAREN', 'SPARKA TILLBAKA 25 SKOTT', p => (p.parries || 0) >= 25, p => [p.parries || 0, 25]],
  ['styleSSS', 'KRYPTISKT', 'NÅ HÖGSTA STILNIVÅN', p => (p.styleMax || 0) >= 6],
  ['gradeS', 'FELFRI', 'FÅ BETYGET S PÅ EN VÅNING', p => (p.gradeS || 0) >= 1],
  ['infight20', 'SPLIT OCH HÄRSKA', 'FÅ FIENDER ATT SLÅSS MOT VARANDRA 20 GÅNGER', p => (p.infights || 0) >= 20, p => [p.infights || 0, 20]],
  ['legend1', 'LEGENDEN', 'HITTA ETT LEGENDARISKT VAPEN', p => (p.legendsFound || []).length >= 1],
  ['legend6', 'SAMLAREN AV LEGENDER', 'HITTA ALLA SEX LEGENDARISKA VAPEN', p => (p.legendsFound || []).length >= 6, p => [(p.legendsFound || []).length, 6]],
  ['allbosses12', 'ALLA BOSSAR', 'BESEGRA VARJE BOSS I SPELET', p => BOSS_IDS.every(id => (p.bossWins || {})[id]), p => [BOSS_IDS.filter(id => (p.bossWins || {})[id]).length, BOSS_IDS.length]],
];
function checkAch() {
  profile.ach = profile.ach || [];
  if (run && run.practice) return; // inga prestationer i övningsläget
  for (const [id, name, text, test] of ACH) {
    if (profile.ach.includes(id)) continue;
    let ok = false; try { ok = !!test(profile, run); } catch (e) { ok = false; }
    if (!ok) continue;
    profile.ach.push(id); profile.achD = Object.assign({}, profile.achD, { [id]: new Date().toISOString().slice(0, 10) }); profile.souls += 10; saveProfile();
    if (state !== 'title') { say('PRESTATION: ' + name + ' (+10 SJÄLAR)', 3); play('gem', 0.8, 0.8); }
  }
  dqCheck();
}
function showNews() {
  CardUI.list('NYHETER', 'VERSION 23: SLAKTERIET OCH SLAGFÄLTET', [
    { label: 'VERSION 23 – SLAKTERIET OCH SLAGFÄLTET', head: true, color: '#d05050' },
    { label: 'TVÅ NYA BIOMER', text: 'SLAKTERIET: KAKLADE SLAKTHALLAR, KYLRUM MED KÖTTKROKAR SOM GUNGAR, BLODHALT GOLV DÄR DU GLIDER OCH KÖTTKVARNAR SOM MAL ALLT – ÄVEN FIENDER DU KNUFFAR IN. DET EVIGA SLAGFÄLTET UNDER GRÅ HIMMEL: LERA, SKYTTEGRAVAR, PALISSADER, DJUP LERA SOM DU INTE KAN HOPPA UR, SPJUTPÅLAR OCH KATAPULTSTENAR SOM SLÅR NED PÅ MARKERADE RUTOR.' },
    { label: 'TVÅ NYA VAPEN', text: 'SLAKTARKROKEN (KASTAS PÅ KEDJA OCH DRAR IN FIENDEN – STORA FIENDER DRAR IN DIG – OCH SLÅR SEDAN) OCH BOMBARDEN (EN TUNG KANONKULA SOM GÅR IGENOM FIENDER OCH STUDSAR I VÄGGEN – HÖGERKLICK SKJUTER DRUVHAGEL) – MED PAKTER.' },
    { label: 'ÅTTA NYA FIENDER OCH TVÅ BOSSAR', text: 'SLAKTARE SOM KASTAR KÖTTYXOR, GRISMÄN SOM RUSAR, FLUGSVÄRMAR OCH STYCKADE SOM KRYPER. SPÖKSOLDATER I FORMATION MED SKÖLDAR, SPÖKBÅGSKYTTAR, SPÖKRYTTARE SOM RUSAR I RAKA LINJER OCH KRÅKOR. SLAKTMÄSTAREN OCH KRIGSHERREN VÄNTAR LÄNGST IN.' },
    { label: 'MER', text: '16 NYA KORT, TVÅ NYA SET, FYRA PRESTATIONER OCH NY MUSIK FÖR BÅDA BIOMERNA OCH BOSSARNA.' },
    { label: 'VERSION 22 – BADHUSET OCH SKÄRSELDEN', head: true, color: '#ff7a50' },
    { label: 'TVÅ NYA BIOMER', text: 'BADHUSET I FÖRFALL: MARMOR OCH MOSAIK, HETA BASSÄNGER SOM SKÅLLAR, ÅNGGALLER SOM SKYMMER SIKTEN, KALLBAD SOM SLÄCKER ELD OCH LÄKER, STATYER OCH FONTÄNER. SKÄRSELDEN UNDER BLODRÖD HIMMEL: ASKFÄLT, ELDFLODER SOM DRAR DIG MED STRÖMMEN, MURAR AV BEN OCH KÖTT, KEDJADE SJÄLAR OCH RUNCIRKLAR SOM KALLAR FRAM DEMONER.' },
    { label: 'TVÅ NYA VAPEN', text: 'TREUDDEN (LÅNG STÖT SOM GENOMBORRAR – HÖGERKLICK KASTAR DEN, OCH DEN KOMMER TILLBAKA) OCH SVAVELMORTERN (ETT BRINNANDE SVAVELKLOT I BÅGE SOM EXPLODERAR OCH LÄMNAR ELD – HÖGERKLICK SKJUTER RAKT FRAM) – MED PAKTER.' },
    { label: 'ÅTTA NYA FIENDER OCH TVÅ BOSSAR', text: 'BADVAKTER MED BLÖTA HANDDUKAR, ÅNGVÅLNADER, GLADIATORER MED SKÖLD OCH NÄT OCH MÖGELKRYPARE. ELDIMPAR, PLÅGADE SJÄLAR SOM STÖRTAR OCH EXPLODERAR, KÖTTBJÄSSAR OCH ASKVANDRARE SOM RESER SIG IGEN. BADMÄSTAREN OCH ELDFURSTEN.' },
    { label: 'MER', text: '16 NYA KORT, TVÅ NYA SET, FYRA PRESTATIONER OCH NY MUSIK FÖR BÅDA BIOMERNA OCH BOSSARNA.' },
    { label: 'VERSION 21 – JÄRNFÄNGELSET OCH FISKELÄGET', head: true, color: '#a0c0d0' },
    { label: 'TVÅ NYA BIOMER', text: 'JÄRNFÄNGELSET: FUKTIGA STENKORRIDORER, CELLRADER MED GALLER, LARMPLATTOR SOM KALLAR PÅ VAKTERNA, HÄNGANDE BURAR SOM KAN SKJUTAS NED, STRÄCKBÄNKAR OCH EN GALGE. DET DIMHÖLJDA FISKELÄGET: BRYGGOR ÖVER MÖRKT VATTEN, DIMMA SOM RULLAR IN OCH UT, EN FYR VARS LJUSKÄGLA SVEPER ÖVER BANAN, FISKNÄT SOM SNÄRJER OCH FISKTUNNOR.' },
    { label: 'TVÅ NYA VAPEN', text: 'MORGONSTJÄRNAN (TUNGA SLAG – HÅLL INNE HÖGERKLICK SÅ SNURRAR KEDJAN ÖVER HUVUDET) OCH TROMBONEN (BRED SKROTSKUR SOM KNUFFAR – HÖGERKLICK AVFYRAR BÅDA LADDNINGARNA) – MED PAKTER.' },
    { label: 'ÅTTA NYA FIENDER OCH TVÅ BOSSAR', text: 'NYCKELKNEKTAR MED VISSELPIPA, KEDJEFÅNGAR, TORTYRMÄSTARE OCH VAKTHUNDAR. DRUNKNADE FISKARE, FISKMÄN SOM HOPPAR UR VATTNET, STRANDKRABBOR MED PANSAR FRAMTILL OCH MÅSSVÄRMAR. BÖDELN OCH TIDVATTENPRÄSTEN.' },
    { label: 'MER', text: '16 NYA KORT, TVÅ NYA SET, FYRA PRESTATIONER OCH NY MUSIK FÖR BÅDA BIOMERNA OCH BOSSARNA.' },
    { label: 'VERSION 20 – KLOAKERNA OCH ÖKNEN', head: true, color: '#e0c070' },
    { label: 'TVÅ NYA BIOMER', text: 'KLOAKERNA: VALVADE TEGELTUNNLAR MED SLAM SOM SAKTAR OCH FÖRGIFTAR, RÖR SOM SPRUTAR HET ÅNGA, SLUSSAR SOM STYRS MED EN RATT OCH RÅTTBON. ÖKNEN UNDER BRÄNNANDE SOL: SANDSTORMAR SOM KOMMER OCH GÅR, OASER SOM LÄKER, HÄGRINGAR, KAKTUSAR, AMFOROR OCH KVICKSAND.' },
    { label: 'TVÅ NYA VAPEN', text: 'KROKSABELN (SNABBA SVEP – HÖGERKLICK GER ETT UTFALLSSTEG TRE RUTOR FRAMÅT) OCH FÄLLKASTAREN (BJÖRNSAXAR SOM SLÅR IGEN OM FIENDER) – MED PAKTER.' },
    { label: 'ÅTTA NYA FIENDER OCH TVÅ BOSSAR', text: 'ALLIGATORER I SLAMMET, SLAMVARELSER, RÖRMOKARE OCH IGLAR SOM FÄSTER SIG. SKORPIONER, NOMADER, SANDVÅLNADER OCH GAMAR. RÅTTKUNGEN OCH SFINXEN.' },
    { label: 'MER', text: '16 NYA KORT, TVÅ NYA SET, FYRA PRESTATIONER OCH NY MUSIK FÖR BÅDA BIOMERNA OCH BOSSARNA.' },
    { label: 'VERSION 19 – GRUVAN OCH OBSERVATORIET', head: true, color: '#c0a0ff' },
    { label: 'TVÅ NYA BIOMER', text: 'DEN ÖVERGIVNA GRUVAN: GRUVVAGNAR SOM RULLAR LÄNGS RÄLSEN, GASFICKOR SOM EXPLODERAR AV ELD, KNAKANDE TAK SOM RASAR, DYNAMITLÅDOR OCH MALMÅDROR SOM GER GULD. STJÄRNOBSERVATORIET HÖGT UPP: STJÄRNKARTEGOLV MED LÅG TYNGDKRAFT, METEORER GENOM KUPOLSPRINGORNA, STJÄRNPORTAR, PLANETARIER OCH TELESKOP.' },
    { label: 'TVÅ NYA VAPEN', text: 'HACKAN (TUNGA SLAG SOM BRYTER MALM OCH STENBUMLINGAR) OCH STJÄRNLANSEN (HÅLL INNE AVTRYCKAREN OCH SLÄPP – EN STJÄRNSTRÅLE GENOM ALLA I EN LINJE) – MED PAKTER.' },
    { label: 'ÅTTA NYA FIENDER OCH TVÅ BOSSAR', text: 'GRUVARBETARE MED DYNAMIT, KOLGOLEMER, MULLVADSMÄN OCH GNISTLYKTOR. STJÄRNFÖDDA, ASTRONOMER, URVERKSUGGLOR OCH TOMRUMSVÄKTARE. GRUVFÖRMANNEN OCH STJÄRNSKÅDAREN.' },
    { label: 'MER', text: '24 NYA KORT, TVÅ NYA SET, FYRA PRESTATIONER OCH NY MUSIK FÖR BÅDA BIOMERNA OCH BOSSARNA.' },
    { label: 'VERSION 18 – CIRKUSEN OCH DJUNGELTEMPLET', head: true, color: '#ff9a7a' },
    { label: 'TVÅ NYA BIOMER', text: 'DEN ÖVERGIVNA CIRKUSEN UNDER RANDIGA TÄLT: FALLLUCKOR I SCENEN, STRÅLKASTARE SOM SÄTTER DIG I RAMPLJUSET, KNIVKASTARHJUL, LYCKOHJUL OCH BALLONGER. DJUNGELTEMPLET UNDER ÖPPEN HIMMEL: PIRAYAVATTEN, LIANER SOM BRINNER, PILIDOLER, GIFTBLOMMOR OCH GULDIDOLER SOM UTLÖSER ETT BAKHÅLL.' },
    { label: 'TVÅ NYA VAPEN', text: 'KÄGLEKASTAREN (TRE JONGLÖRKÄGLOR SOM STUDSAR MOT VÄGGARNA) OCH BLÅSRÖRET (EN TYST GIFTPIL – SIKTA PÅ HUVUDET FÖR DUBBEL SKADA) – MED PAKTER.' },
    { label: 'TOLV NYA FIENDER OCH TVÅ BOSSAR', text: 'CLOWNER, JONGLÖRER, STYLTGÅNGARE, KNIVKASTARE, CIRKUSLEJON OCH MARIONETTER. ÖDLEKRIGARE, BLÅSRÖRSJÄGARE, APOR SOM STJÄL AMMO, JAGUARER, MYGGSVÄRMAR OCH TEMPELVÄKTARE. CIRKUSDIREKTÖREN OCH DEN FJÄDRADE ORMEN.' },
    { label: 'MER', text: '24 NYA KORT, TVÅ NYA SET, FYRA PRESTATIONER OCH NY MUSIK FÖR BÅDA BIOMERNA OCH BOSSARNA.' },
    { label: 'VERSION 17 – SPÖKSKEPPET OCH LABORATORIET', head: true, color: '#90e0c0' },
    { label: 'TVÅ NYA BIOMER', text: 'SPÖKSKEPPET PÅ ETT NATTSVART HAV: RUTTNA PLANKOR SOM BRAKAR IGENOM, SKÖLJT DÄCK SOM ÄR HALT OCH SKÖLJS AV VÅGOR, KANONER DU KAN AVFYRA OCH KRUTTUNNOR. LABORATORIET: SYRAKAR, TRANSMUTATIONSCIRKLAR, TESLASPOLAR SOM SLÅR BLIXTAR MOT DET NÄRMASTE, FLASKHYLLOR OCH ALEMBIKER DÄR DU BRYGGER DRYCKER.' },
    { label: 'TVÅ NYA VAPEN', text: 'KEDJEKULEKANONEN (EN SNURRANDE KEDJEKULA SOM GÅR IGENOM FLERA FIENDER) OCH SYRASPRUTAN (EN GRÖN STRÅLE SOM FRÄTER – FIENDERNA TAR MER SKADA EN STUND) – MED PAKTER.' },
    { label: 'TOLV NYA FIENDER OCH TVÅ BOSSAR', text: 'SPÖKPIRATER, KANONJÄRER, DRUNKNADE MATROSER, PAPEGOJSPÖKEN SOM STJÄL GULD, TENTAKLER OCH SKEPPSRÅTTOR. HOMUNKULUSAR, SLEM, LÄRLINGAR, KVICKSILVERGOLEMER, FLASKGASTAR OCH KIMÄRER. SPÖKKAPTENEN OCH ALKEMISTEN.' },
    { label: 'MER', text: '24 NYA KORT, TVÅ NYA SET, FYRA PRESTATIONER OCH NY MUSIK FÖR BÅDA BIOMERNA OCH BOSSARNA.' },
    { label: 'VERSION 16 – TRÄDGÅRDEN OCH DRÖMRIKET', head: true, color: '#c0a0ff' },
    { label: 'TVÅ NYA BIOMER', text: 'DEN DÖDA TRÄDGÅRDEN MED HÄCKAR, TAGGRANKOR SOM BRINNER BORT OCH FONTÄNER. DRÖMRIKET MED VÄGGAR SOM FLYTTAR SIG, FALSKA DÖRRAR OCH SÖMNENS DIMMA.' },
    { label: 'TVÅ NYA VAPEN', text: 'TRÄDGÅRDSSAXEN (SNABBA KLIPP, HÖGERKLICK KASTAR DEN SOM KOMMER TILLBAKA) OCH DRÖMSTAVEN (EN LÅNGSAM STJÄRNA SOM SÖVER).' },
    { label: 'SEX NYA FIENDER OCH TVÅ BOSSAR', text: 'STENÄNGLAR SOM BARA RÖR SIG NÄR DU INTE TITTAR, TAGGRANKOR, TRÄDGÅRDSDRÄNGAR, DRÖMÄTARE SOM ÄTER LJUS, SPEGLINGAR SOM SKJUTER NÄR DU SKJUTER OCH SÖMNGÅNGARE. TRÄDGÅRDSMÄSTAREN OCH JON BLUND.' },
    { label: 'VERSION 15 – KATEDRALEN OCH BIKUPAN', head: true, color: '#ff9090' },
    { label: 'TVÅ NYA BIOMER', text: 'BLODKATEDRALEN MED LJUSSTRÅK SOM VÄLSIGNAR, BLODFUNTAR SOM LÄKER FIENDERNA OCH KLOCKOR SOM BEDÖVAR. BIKUPAN MED HONUNG SOM KLIBBAR OCH LARVSÄCKAR SOM KLÄCKS.' },
    { label: 'TVÅ NYA VAPEN', text: 'RÖKELSEKARET (SVÄNGS RUNT DIG OCH LÄKER) OCH BIKASTAREN (BIN SOM SÖKER UPP FIENDER OCH STICKER) – MED PAKTER.' },
    { label: 'SEX NYA FIENDER OCH TVÅ BOSSAR', text: 'KORGOSSAR, BOTGÖRARE, KERUBER, ARBETSBIN, GADDKRIGARE OCH LARVER. KARDINALEN OCH BIDROTTNINGEN.' },
    { label: 'VERSION 14 – ARENORNA', head: true, color: '#ffb080' },
    { label: 'ARENARUM', text: 'NÅGRA RUM LÅSER GALLREN NÄR DU GÅR IN. ÖVERLEV VÅGORNA SÅ ÖPPNAS DE IGEN – OCH EN BELÖNING VÄNTAR.' },
    { label: 'NYA RUM', text: 'FLER HANDGJORDA RUMSTYPER I ALLA DE GAMLA BIOMERNA.' },
    { label: 'SEX NYA FIENDER', text: 'SNÖFANTOMEN (FROST), LAVAORMEN (VULKAN), SKARABÉPRÄSTEN (GRAVKAMMARE), KRISTALLSPINDELN (KRISTALL), MARULKEN (SJUNKEN STAD) OCH VINDANDEN (MOLNBORGEN).' },
    { label: 'VERSION 13 – BIBLIOTEKET OCH GJUTERIET', head: true, color: '#e0c080' },
    { label: 'TVÅ NYA BIOMER', text: 'DET FÖRBJUDNA BIBLIOTEKET MED BLÄCK SOM BLÄNDAR OCH PULPETER MED BÖCKER. GJUTERIET MED RULLBAND, SMÄLT METALL, ÅNGVENTILER OCH STANSAR.' },
    { label: 'TVÅ NYA VAPEN', text: 'RUNBOKEN (MÅLSÖKANDE RUNOR, HÖGERKLICK: EN VIRVEL AV SIDOR SOM FÅNGAR SKOTT) OCH ÅNGKANONEN (SKÅLLANDE ÅNGA SOM KNUFFAR).' },
    { label: 'SEX NYA FIENDER OCH TVÅ BOSSAR', text: 'FLYGANDE BÖCKER, BLÄCKSLEM, ARKIVARIESPÖKEN, SMÄLTGOLEMER, ÅNGAUTOMATER OCH GNISTDRÖNARE. BIBLIOTEKARIEN OCH SMIDESKOLOSSEN.' },
    { label: 'MER', text: '48 NYA KORT, FYRA NYA SET OCH FLER PRESTATIONER.' },
    { label: 'VERSION 12 – BLODETS RYTM', head: true, color: '#ff8060' },
    { label: 'STILMÄTAREN', text: 'VARIERA DIG: NYTT VAPEN, I LUFTEN, HUVUDTRÄFF, FLERDÖD, AVRÄTTNING. NIVÅERNA D TILL SSS GER GULD OCH ERFARENHET. SKADA SÄNKER DEN.' },
    { label: 'AVRÄTTNINGAR', text: 'FIENDER PÅ LÅG HÄLSA VACKLAR OCH LYSER. SPARKA (V) ELLER SLÅ DEM – DE DÖR DIREKT OCH DU FÅR HÄLSA, ÄVEN ÖVER MAX.' },
    { label: 'SPARKPARERING', text: 'SPARKA ETT SKOTT PRECIS INNAN DET TRÄFFAR – DET FLYGER TILLBAKA MOT SKYTTEN MED DUBBEL KRAFT OCH DU FÅR 10 HÄLSA.' },
    { label: 'RESURSLOOPEN', text: 'DÖDANDEN NÄRA LÄKER LITE, BRINNANDE FIENDER GER SKYDD NÄR DE DÖR OCH NÄRSTRIDSDÖDANDEN GER AMMO.' },
    { label: 'INBÖRDES STRID', text: 'FIENDERNAS SKOTT SKADAR ANDRA SORTERS FIENDER – SOM GER IGEN.' },
    { label: 'GLIDSPARK OCH GLIDHOPP', text: 'SPRING OCH DUCKA FÖR ATT GLIDA. GLIDNINGEN SPARKAR UNDAN FIENDER, OCH ETT HOPP MITT I BEHÅLLER FARTEN.' },
    { label: 'BETYG OCH KLOCKAN', text: 'VARJE VÅNING FÅR BETYG S–D SOM GER GULD. NY UTMANING: KLOCKAN – TIO SEKUNDER ATT LEVA, VARJE DÖD GER MER TID.' },
    { label: 'MER', text: 'SNABBARE VAPENBYTEN, PENGAR OCH AMMO DRAS TILL DIG, FEM NYA PRESTATIONER.' },
    { label: 'VERSION 11 – SVAMPRIKET OCH SPEGELPALATSET', head: true, color: '#b0ffb8' },
    { label: 'TVÅ NYA BIOMER', text: 'SVAMPRIKET MED GLÖDSVAMPAR, STUDSPLATTOR SOM KASTAR DIG LÅNGT OCH SPORPÖLAR SOM VÄNDER PÅ STYRNINGEN OCH GER SYNER. SPEGELPALATSET MED SPEGELVÄGGAR SOM STUDSAR ALLA SKOTT OCH TELEPORTRAR I PAR.' },
    { label: 'TRE NYA VAPEN', text: 'SPORKASTAREN (SPORBOLLAR SOM LÄMNAR GIFTMOLN), SPEGELSKÖLDEN (SLAG – OCH HÖGERKLICK HÅLLER UPP SKÖLDEN SOM STUDSAR TILLBAKA SKOTTEN, PERFEKT TIMING PARERAR) OCH PISKAN (LÅNG RÄCKVIDD, SPETSEN SMÄLLER HÅRDAST, DRAR FIENDER TILL DIG) – MED PAKTER.' },
    { label: 'SEX NYA FIENDER', text: 'SPORLINGAR SOM SPRICKER I SPORER, MYCELBESTAR SOM LÄKER SIG I SPORER, SVAMPSHAMANER, SPEGELRIDDARE MED SKÖLD, ILLUSIONISTER MED FALSKA KOPIOR OCH GLASSKÄRVOR SOM SPLITTRAS.' },
    { label: 'TVÅ NYA BOSSAR', text: 'MYCELMODERN SOM LÅTER MYCELET VÄXA UNDER DIG OCH SPEGELKUNGEN SOM DELAR SIG I SPEGELBILDER. NU FINNS FJORTON BOSSAR.' },
    { label: 'MER', text: '24 NYA KORT, TVÅ NYA SET, ÅTTA NYA KORTEGENSKAPER, TRE PRESTATIONER OCH NY MUSIK FÖR BÅDA BIOMERNA OCH BOSSARNA.' },
    { label: 'LUGNARE GRÄNSSNITT', text: 'STATUSLISTEN HAR EN STOR SIFFRA PER FÄLT SOM I DE KLASSISKA SPELEN. ETT MEDDELANDE I TAGET, MINDRE KARTA, TYSTARE MÅL, EN LUGN PAUS OCH STATISTIK UTAN ÖVERLAPP. STARTSKÄRMEN SAMLAR KLASS OCH SVÅRIGHET UNDER ANPASSA RUNDAN.' },
    { label: 'VERSION 10 – NYA INVÅNARE', head: true, color: '#ffd0a0' },
    { label: 'SEX NYA FIENDER', text: 'FÅNGVAKTARE, GRÄVARE, LIKGRÄVARE, ROTVÄTTEN, ARMBORSTSKYTTAR OCH PADDJÄTTAR I DE TIDIGA BIOMERNA.' },
    { label: 'LEGENDARISKA VAPEN', text: 'SEX VARIANTER AV GAMLA VAPEN. HITTAS SÄLLAN HOS ELITER OCH VÄKTARE ELLER KÖPS VID LEGENDALTARET.' },
    { label: 'FÖLJESLAGARE OCH BANBYGGAREN', text: 'ELDFLUGAN, STENGOLEMEN OCH UGGLAN. RITA, PROVSPELA OCH DELA EGNA BANOR UNDER FLER LÄGEN.' },
    { label: 'VERSION 9 – KLOCKTORNET OCH MOLNBORGEN', head: true, color: '#ffe0a0' },
    { label: 'TVÅ NYA BIOMER', text: 'KLOCKTORNET MED SÅGSPÅR, TIDSBUBBLOR OCH URVERK. MOLNBORGEN MED FLYTANDE ÖAR, TOMRUM, VINDBYAR OCH ÅSKA.' },
    { label: 'TRE NYA VAPEN', text: 'SÅGBLADSKASTAREN (STUDSANDE KLINGOR), VINDBÖSSAN (KNUFFA FIENDER IN I VÄGGAR – ELLER UT I TOMRUMMET) OCH SPJUTET (STÖT, OCH KAST MED HÖGERKLICK).' },
    { label: 'SEX NYA FIENDER', text: 'URVERKSSOLDAT SOM LINDAS UPP IGEN, KUGGSPINDLAR, TIDSVÄKTARE, HARPYOR, STORMKALLARE OCH MOLNJÄTTAR.' },
    { label: 'TVÅ NYA BOSSAR', text: 'URMAKAREN SOM VRIDER TILLBAKA TIDEN OCH STORMFÅGELN SOM DYKER OCH KALLAR PÅ ÅSKAN. NU FINNS TOLV BOSSAR.' },
    { label: 'VERSION 8 – AVGRUNDEN', head: true, color: '#c0a0ff' },
    { label: 'TALANGER', text: 'DÖDANDEN GER ERFARENHET. VARJE NY NIVÅ GER ETT VAL AV TRE TALANGER UR TRE GRENAR: KRIGAREN, SKUGGAN OCH MYSTIKERN. 30 TALANGER, NÅGRA KRÄVER ANDRA.' },
    { label: 'TVÅ NYA BIOMER', text: 'KRISTALLGROTTORNA MED GLÖDANDE KRISTALLER, SPIKAR OCH BRYTANDE KRISTALLER SOM DELAR SKOTT. DEN SJUNKNA STADEN MED DJUPT VATTEN, LUFT OCH TIDVATTEN.' },
    { label: 'TRE NYA VAPEN', text: 'HARPUNEN (DRAR IN FIENDER, ELLER DIG TILL VÄGGEN), BUMERANGEN (KOMMER TILLBAKA) OCH PRISMAN (STRÅLE SOM STUDSAR MOT VÄGGAR) – MED PAKTER.' },
    { label: 'ÅTTA NYA FIENDER', text: 'KRISTALLGOLEM, SKÄRVIRRBLOSS, DRUNKNAD SJÖMAN, ÅL, SIREN, JÄTTEKRABBA, SKUGGJÄGARE OCH HÄXA.' },
    { label: 'TVÅ NYA BOSSAR', text: 'KRISTALLDROTTNINGEN MED SPEGELSKÖLD OCH LEVIATAN SOM DYKER I BASSÄNGEN.' },
    { label: 'AVGRUNDEN', text: 'NYTT LÄGE: OÄNDLIG NEDSTIGNING DÄR VARJE VÅNING ÄR SVÅRARE. EN BOSS VAR SJÄTTE VÅNING.' },
    { label: 'MER', text: 'KARTOGRAFEN, TALANGALTARE, VRAKKISTOR, KUNSKAPSBÖCKER, KLASSEN DYKAREN, 10 PRESTATIONER OCH NYA DAGLIGA UPPDRAG.' },
    { label: 'VERSION 7', head: true, color: '#ffd070' },
    { label: 'TRE NYA VAPEN', text: 'KASTKNIVARNA (PLOCKA UPP DEM IGEN), STRIDSHAMMAREN (HÅLL FÖR ETT MARKSLAG) OCH MUSKÖTEN (ETT SKOTT, GENOMBORRAR, KRUTRÖK) – MED PAKTER OCH VAPENVANA' },
    { label: 'GRAVKAMMAREN', text: 'EN NY BIOM MED KVICKSAND, RULLANDE STENBLOCK, SARKOFAGER, SOLSTRÅLAR OCH SANDSTORM. FEM NYA FIENDER OCH DEN ÅTTONDE BOSSEN: FARAONEN.' },
    { label: 'SMYG', text: 'FIENDERNA UPPTÄCKER DIG GRADVIS. DUCKA I MÖRKRET, KASTA STENAR (G), AKTA LARMKLOCKOR OCH DÖDA OSEDD FÖR GULD.' },
    { label: 'FICKLAMPAN', text: 'L TÄNDER LAMPAN. BATTERIER FINNS PÅ VÅNINGARNA – MEN FIENDERNA SER LJUSET.' },
    { label: 'KRÖNIKAN', text: '40 SIDOR OM KRYPTANS HISTORIA. HITTA DEM (þ) PÅ VÅNINGARNA OCH LÄS DEM FRÅN STARTSKÄRMEN.' },
    { label: 'NYA NPC:ER', text: 'SPELAREN (TÄRNING, HÖGRE/LÄGRE, LYCKOHJUL), BANKIREN (RÄNTA, SJÄLAR) OCH VANDRAREN MED EN UPPDRAGSKEDJA. PRUTA, STJÄL OCH SÄLJ HOS KÖPMANNEN.' },
    { label: 'KORT', text: '20 NYA KORT, TVÅ NYA SET, PAKTER FÖR DE NYA VAPNEN, GLANS PÅ OVANLIGA KORT, KORTSÖKNING OCH FÖRSÄLJNING.' },
    { label: 'NYA LÄGEN', text: 'LABYRINTEN, BOSSJAKTEN, MÅNADENS UTMANING, MÖRKERLÄGET OCH KOMBINERADE UTMANINGAR. ÖVA MOT VALFRI FIENDE.' },
    { label: 'META', text: 'TJUVEN OCH ÖKENVANDRAREN, TRE NYA UPPGRADERINGAR PÅ ALTARET, 20 PRESTATIONER, TITLAR, TRE SPARPLATSER OCH BERÄTTELSELÄGET.' },
    { label: 'TILLGÄNGLIGHET', text: 'UPPLÄSNING, VISUELLA LJUDSIGNALER, MINSKA RÖRELSE, HUD-LÄGEN, VÄXLA SIKTE, STÖRRE MENYER PÅ MOBIL OCH EN PAUSMENY (ENTER).' },
    { label: 'VERSION 6', head: true, color: '#ffb070' },
    { label: 'TRE NYA VAPEN', text: 'SPIKGEVÄRET, BLIXTSTAVEN (MANA, LADDAT KLOT) OCH LÅNGBÅGEN (SPÄNN OCH SLÄPP) – MED EGNA PAKTER' },
    { label: 'FEM NYA FIENDER', text: 'NEKROMANT, ELDELEMENTAL, LAVAMASK, DÖDSRIDDARE OCH BANSHEE' }, { label: 'VULKANEN', text: 'LAVAFLODER, ASKREGN, HETTA, UTBROTT – OCH ELDKUNGEN' },
    { label: 'RUNOR', text: 'FÄST RUNOR I VAPNEN: ELD, IS, GIFT, STORM, BLOD OCH EKO' }, { label: 'LÄGERELDEN', text: 'VILA, SMID, FÖRÄDLA ETT KORT ELLER LAGA MAT' },
    { label: 'UPPDRAG', text: 'ANSLAGSTAVLAN, DAGLIGA UPPDRAG OCH HEMLIGA VÅNINGAR' }, { label: 'FÖRMÅGOR', text: 'FEM KORT GER EN AKTIV FÖRMÅGA PÅ T' },
    { label: 'FÄLLOR', text: 'ELDJETAR, PENDELBLAD, SKÖRA GOLV, TRYCKPLATTOR, GIFT- OCH ISFAT' }, { label: 'LÄGEN', text: 'ÖVERLEVNAD, SPÖKET, INTRODUKTION, SNABB RUNDA OCH STATISTIK' },
    { label: 'TILLGÄNGLIGHET', text: 'FLYTTA MOBILKNAPPARNA, BYT KNAPPAR PÅ HANDKONTROLLEN, SPELHASTIGHET OCH HÖG KONTRAST' },
    { label: 'VERSION 5', head: true, color: '#9fe0ff' },
    { label: 'TRE NYA VAPEN', text: 'YXAN (LADDA, KASTA, BLOCKERA), ELDKASTAREN OCH GRANATKASTAREN – MED EGNA PAKTER' }, { label: 'FEM NYA FIENDER', text: 'GHOUL, KULTIST, GARGOYL, ISVARG OCH IRRBLOSS' },
    { label: 'FROSTFÄSTET', text: 'EN NY BIOM MED SNÖ, IS, KYLA OCH ISTAPPAR – OCH ISDRAKEN' }, { label: 'FÖLJESLAGARE', text: 'KORPEN, LYKTAN OCH VARGVALPEN. LÅS UPP DEM I SJÄLAALTARET' },
    { label: 'DRYCKER', text: 'H DRICKER, J BYTER. FEM SORTER, OKÄNDA TILLS DU SMAKAT' }, { label: 'NPC:ER', text: 'ALKEMISTEN, PRÄSTEN, DEN HEMLIGA HANDLAREN OCH VÄGVAL MELLAN TVÅ PORTALER' },
    { label: '30 NYA KORT', text: 'KORTFUSION, KORTSTATISTIK OCH TVÅ NYA KORTSET' }, { label: 'KÄNSLA', text: 'FÄRGAT LJUS, HUVUDTRÄFFAR, GLÖDANDE ÖGON OCH BLODSPÅR' },
    { label: 'MER', text: 'TVÅ NYA KLASSER, UTMANINGSLÄGEN, 20 PRESTATIONER, DÖDSRAPPORT OCH TILLGÄNGLIGHET' },
    { label: 'VERSION 4', head: true, color: '#ffd24a' },
    { label: 'RÖRELSE', text: 'HOPP, DUCKA, GLID, RUSNING OCH UTHÅLLIGHET' }, { label: 'GRANATER', text: 'F KASTAR, HÅLL FÖR LÄNGRE KAST' },
    { label: 'TRÄSKET', text: 'EN NY BIOM MED VATTEN, NÄT OCH SVAMPAR' }, { label: 'SJU NYA FIENDER', text: 'SPINDLAR, FLADDERMÖSS, HUNDAR, BOMBSKELETT, SKÖLDBÄRARE, SVAMPMÄN OCH LEVANDE RUSTNINGAR' },
    { label: 'BOSSAR', text: 'TVÅ NYA ANFALL PER BOSS, YRSEL, ILSKA OCH BOSSRUSH' }, { label: 'FÖREMÅL', text: 'SMEDJA, SPÅALTARE, FÅNGAR, UTMANINGAR, SPAKAR, NYCKLAR, FÄLLOR OCH SPRUCKNA VÄGGAR' },
    { label: '50 NYA KORT', text: 'OCH SEX KORTSET MED BONUSAR' }, { label: 'KLASSER', text: 'FEM KLASSER OCH UPPSTIGNING PÅ MARDRÖM' },
    { label: 'HANDKONTROLL', text: 'OCH TANGENTBYTE, GYRO, FÄRGBLINDLÄGEN OCH UNDERTEXTER' }], () => refreshTitle());
}
function showManual() {
  CardUI.list('HANDBOK', 'SÅ FUNGERAR KRYPTA', [
    { label: 'MÅLET', head: true, color: '#ffd24a' }, { label: 'RUNDAN', text: 'FEM VÅNINGAR OCH EN BOSS PER VARV. PORTALEN ÖPPNAS NÄR ELITERNA, VÄKTAREN ELLER ALLA FIENDER ÄR DÖDA.' },
    { label: 'DÖDEN', text: 'DÖDEN AVSLUTAR RUNDAN. SJÄLARNA DU SAMLAT LÅSER UPP KORT, KLASSER OCH UPPGRADERINGAR.' },
    { label: 'KONTROLLER', head: true, color: '#ffd24a' }, { label: 'TANGENTBORD', text: 'WASD GÅ · MUS SIKTA · SPACE HOPPA · CTRL DUCKA · SHIFT SPRING · Z RUSA · E ANVÄND · R LADDA OM · F GRANAT · V SPARK · Q FÖRRA VAPNET' },
    { label: 'HANDKONTROLL', text: 'VÄNSTER SPAK GÅ · HÖGER SPAK SIKTA · RT SKJUT · LT SIKTA · A HOPPA · B DUCKA · X ANVÄND · Y BYT VAPEN · LB RUSA · RB GRANAT · UPP LADDA OM · START PAUS' },
    { label: 'STATUS', head: true, color: '#ffd24a' }, { label: 'BRAND', text: 'SKADAR ÖVER TID. BRÄNNER NÄT. BRÄNDA FIENDER BLIR ASKA.' }, { label: 'GIFT', text: 'SKADAR ÖVER TID OCH SPRIDS IBLAND.' },
    { label: 'FRYSNING', text: 'FIENDEN STÅR STILL OCH SPLITTRAS OM DEN DÖR.' }, { label: 'BLIXT', text: 'HOPPAR TILL EN FIENDE I NÄRHETEN.' },
    { label: 'VÄRLDEN', head: true, color: '#ffd24a' }, { label: 'LAVA', text: 'BRÄNNER – HOPPA ÖVER.' }, { label: 'VATTEN OCH NÄT', text: 'SAKTAR NED. NÄT BRINNER.' }, { label: 'IS', text: 'HALT.' },
    { label: 'NYCKLAR', text: 'ÖPPNAR LÅSTA DÖRRAR OCH KISTOR.' }, { label: 'SPAKAR', text: 'ÖPPNAR JÄRNGALLER NÅGONSTANS PÅ VÅNINGEN.' }, { label: 'SPRUCKNA VÄGGAR', text: 'SPRÄNG DEM MED GRANATER ELLER KRUTFAT.' },
    { label: 'SMEDJAN', text: 'GER VAPNET +12 % SKADA PER NIVÅ OCH FÄSTER RUNOR.' },
    { label: 'VERSION 23', head: true, color: '#d05050' }, { label: 'SLAKTERIET', text: 'PÅ DET BLODHALA GOLVET GLIDER DU OCH BROMSAR SENT – FIENDERNA OCKSÅ. KÖTTKVARNAR MAL (12 SKADA/S); KNUFFADE FIENDER TAR DUBBELT. FLUGSVÄRMAR DRAS TILL LIKEN.' },
    { label: 'SLAGFÄLTET', text: 'DJUP LERA SAKTAR DIG 45 % OCH DU KAN INTE HOPPA UR DEN. VAR SJUNDE SEKUND LANDAR EN KATAPULTSTEN PÅ VARJE MARKERAD RUTA (30 SKADA) – SE SKUGGAN OCH LYSSNA EFTER VISSLANDET. SPJUTPÅLAR STICKER. SPÖKSOLDATERNAS SKÖLDAR TAR SKOTT FRAMIFRÅN – MINDRE NÄR FORMATIONEN ÄR BRUTEN.' },
    { label: 'KROKEN OCH BOMBARDEN', text: 'SLAKTARKROKEN NÅR 6 RUTOR: SMÅ FIENDER DRAS IN, STORA DRAR IN DIG – SEDAN SLÅR KROKEN (45 SKADA). BOMBARDENS KULA GÖR 80 SKADA, GÅR IGENOM FIENDER (25 % MINDRE PER FIENDE) OCH STUDSAR EN GÅNG. HÖGERKLICK: DRUVHAGEL MED 8 KULOR PÅ KORT HÅLL.' },
    { label: 'VERSION 22', head: true, color: '#ff7a50' }, { label: 'BADHUSET', text: 'HETA BASSÄNGER SAKTAR DIG OCH SKÅLLAR (3 SKADA/S). ÅNGGALLREN VÄLLER UPP ÅNGA TVÅ SEKUNDER VAR SJÄTTE – DÅ SER DU KNAPPT NÅGOT, MEN ÅNGVÅLNADERNA SYNS. KALLBAD SLÄCKER ELD OCH LÄKER UPP TILL HALV HÄLSA (30 HP PER BAD).' },
    { label: 'SKÄRSELDEN', text: 'ELDFLODERNA BRÄNNER (6 SKADA/S) OCH DRAR DIG MED STRÖMMEN. KLIVER DU I EN RUNCIRKEL KALLAS TVÅ ELDIMPAR FRAM. ASKVANDRARE RESER SIG EN GÅNG – SPRÄNG ELLER BRÄNN DEM. GLADIATORENS SKÖLD TAR SKOTT FRAMIFRÅN.' },
    { label: 'TREUDDEN OCH SVAVELMORTERN', text: 'TREUDDENS STÖT NÅR 2,2 RUTOR OCH GÅR IGENOM TVÅ FIENDER. KASTAD (HÖGERKLICK) GÖR DEN 90 SKADA OCH KOMMER TILLBAKA EFTER 1,2 S – UNDER TIDEN SLÅSS DU MED NÄVARNA. SVAVELKLOTET EXPLODERAR OCH LÄMNAR ELD I 3 S.' },
    { label: 'VERSION 21', head: true, color: '#a0c0d0' }, { label: 'LARMPLATTOR OCH BURAR', text: 'KLIVER DU PÅ EN RÖDLYSANDE LARMPLATTA RINGER EN KLOCKA: ALLA FIENDER INOM 14 RUTOR LARMAS OCH TVÅ NYCKELKNEKTAR KOMMER. HOPPA ÖVER DEM. HÄNGANDE BURAR FALLER AV 25 SKADA OCH SLÄPPER NÅGOT – IBLAND EN FÅNGE.' },
    { label: 'FISKELÄGET', text: 'DIMMAN RULLAR IN OCH UT. FYRENS LJUSKÄGLA SVEPER ÖVER BANAN. FISKNÄT SAKTAR DIG OCH SNÄRJER DIG EN STUND – ELD BRÄNNER BORT DEM. FISKTUNNOR GER AMMO ELLER FISK (5 HP). FISKMÄN GÖMMER SIG I DJUPVATTNET.' },
    { label: 'KRABBOR OCH VAPEN', text: 'STRANDKRABBAN TAR 75 % MINDRE SKADA FRAMIFRÅN – ANFALL FRÅN SIDAN ELLER SPRÄNG DEN. MORGONSTJÄRNANS SNURR (HÅLL HÖGERKLICK) TRÄFFAR ALLT RUNT DIG. TROMBONENS DUBBELLADDNING (HÖGERKLICK) AVFYRAR BÅDA PIPORNA.' },
    { label: 'VERSION 20', head: true, color: '#e0c070' }, { label: 'SLAM OCH ÅNGA', text: 'SLAMMET SAKTAR DIG 40 % OCH FÖRGIFTAR (2 SKADA/S). RÖREN SPRUTAR HET ÅNGA EN SEKUND VAR FJÄRDE – LYSSNA EFTER VÄSANDET (8 SKADA).' },
    { label: 'SLUSSAR OCH RÅTTBON', text: 'SLUSSRATTEN ÖPPNAR ELLER STÄNGER ALLA SLUSSAR PÅ VÅNINGEN. RÅTTBON SLÄPPER UT RÅTTOR VAR TOLFTE SEKUND TILLS DU FÖRSTÖR DEM (30 SKADA).' },
    { label: 'ÖKNEN', text: 'VAR TRETTIONDE SEKUND KOMMER EN SANDSTORM I SEX SEKUNDER – DÅ SER DU KNAPPT NÅGOT OCH SANDVÅLNADERNA BLIR OSYNLIGA. OASER LÄKER UPP TILL 60 % (40 HP PER OAS). HÄGRINGAR FÖRSVINNER NÄR DU KOMMER NÄRA. KAKTUSAR STICKS.' },
    { label: 'IGLAR OCH BJÖRNSAXAR', text: 'EN IGEL SOM FÄST SIG SUGER BLOD – SKJUT DEN ELLER HOPPA TRE GÅNGER. FÄLLKASTARENS SAXAR LIGGER KVAR (HÖGST FYRA) OCH HÅLLER FIENDEN FAST I 3 S.' },
    { label: 'VERSION 19', head: true, color: '#c0a0ff' }, { label: 'GRUVVAGNAR', text: 'VAGNARNA RULLAR LÄNGS RÄLSEN OCH KNUFFAR DIG (15 SKADA) – GÅ ÖVER MELLAN DEM. FIENDER SOM TRÄFFAS TAR 40 SKADA. EN VAGN I VILA KAN DU PUFFA (E) SÅ ATT DEN RULLAR SEX RUTOR.' },
    { label: 'GAS, RAS OCH DYNAMIT', text: 'GRUVGASEN SKADAR LITE OCH EXPLODERAR AV ELD. STÅ INTE UNDER ETT KNAKANDE TAK – DET RASAR EFTER 0,8 S. DYNAMITLÅDOR SMÄLLER AV SKOTT OCH ELD. HACKAN BRYTER STENBUMLINGAR OCH MALMÅDROR (GULD).' },
    { label: 'STJÄRNOR', text: 'PÅ STJÄRNKARTEGOLVET ÄR TYNGDKRAFTEN LÅG – HOPPEN BLIR DUBBELT SÅ HÖGA OCH LÅNGA. METEORER FALLER GENOM KUPOLSPRINGORNA DÄR RINGEN LYSER. STJÄRNPORTARNA GÅR I PAR.' },
    { label: 'PLANETARIUM OCH TELESKOP', text: 'VRID PLANETARIET SÅ SYNS UTGÅNGEN OCH HEMLIGHETERNA PÅ KARTAN. TELESKOPET VISAR ALLA FIENDER I 20 S. STJÄRNLANSEN: HÅLL INNE 0,2–1,2 S OCH SLÄPP.' },
    { label: 'VERSION 18', head: true, color: '#ff9a7a' }, { label: 'FALLLUCKOR OCH RAMPLJUS', text: 'FALLLUCKORNA I CIRKUSEN SKAKAR EN STUND INNAN DE ÖPPNAS – KLIV AV. FIENDER SOM STÅR PÅ DEM FALLER. I STRÅLKASTARENS LJUS GÖR DU 25 % MER SKADA, MEN ALLA FIENDER VET VAR DU ÄR.' },
    { label: 'LYCKOHJUL OCH BALLONGER', text: 'LYCKOHJULET KOSTAR 10 GULD OCH GER GULD, EN DRYCK, AMMO, ETT KORT – ELLER EN CLOWN. SKJUT BALLONGERNA SÅ RAMLAR NÅGOT UT. KNIVKASTARHJULET GÅR SÖNDER OM DU SKJUTER PÅ DET.' },
    { label: 'PIRAYOR OCH LIANER', text: 'PIRAYAVATTNET BITER OCH SAKTAR NED, LIANERNA SAKTAR NED ÄNNU MER – BRÄNN BORT DEM MED ELD.' },
    { label: 'IDOLER OCH BLOMMOR', text: 'PILIDOLEN SKJUTER EN GIFTPIL NÄR DU STÅR I LINJE MED DEN. GIFTBLOMMAN SPRUTAR GIFT NÄR DU KOMMER NÄRA. GULDIDOLEN GER 40 GULD – OCH ETT BAKHÅLL.' },
    { label: 'VERSION 17', head: true, color: '#90e0c0' }, { label: 'RUTTNA PLANKOR OCH VÅGOR', text: 'STÅ INTE STILLA PÅ RUTTNA PLANKOR – DE BRAKAR IGENOM. DET SKÖLJDA DÄCKET ÄR HALT OCH VAR SJÄTTE SEKUND KNUFFAR EN VÅG ALLT SOM STÅR PÅ DET.' },
    { label: 'KANONER OCH RINGAR', text: 'E AVFYRAR EN KANON DIT DU TITTAR. KANONJÄRER OCH LÄRLINGAR LOBBAR SKOTT – DE LANDAR DÄR RINGEN LYSER.' },
    { label: 'SYRA OCH TRANSMUTATION', text: 'SYRAN FRÄTER FÖRST RUSTNINGEN, SEDAN DIG. EN FIENDE PÅ EN TRANSMUTATIONSCIRKEL BLIR AV GULD: STILLA, DUBBEL SKADA OCH GULD OM DEN DÖR. SJÄLV FÅR DU EN DRYCK.' },
    { label: 'TESLASPOLAR OCH ALEMBIKER', text: 'TESLASPOLEN SLÅR EN BLIXT MOT DET NÄRMASTE LEVANDE – DIG ELLER EN FIENDE. ALEMBIKEN BRYGGER EN DRYCK FÖR 20 GULD, HÖGST TVÅ GÅNGER.' },
    { label: 'VERSION 16', head: true, color: '#c0a0ff' }, { label: 'STENÄNGLAR', text: 'RÖR SIG BARA NÄR DU INTE TITTAR PÅ DEM. HÅLL ÖGONEN PÅ DEM MEDAN DU SKJUTER.' },
    { label: 'TAGGRANKOR OCH DIMMA', text: 'TAGGRANKORNA RIVER – BRÄNN BORT DEM MED ELD. I SÖMNENS DIMMA FÖRSVINNER FIENDERNA PÅ AVSTÅND.' },
    { label: 'GLIDANDE VÄGGAR', text: 'I DRÖMRIKET FLYTTAR SIG VISSA VÄGGAR VARANNAN SEKUND. FALSKA DÖRRAR VÄCKER EN FIENDE.' },
    { label: 'VERSION 13–15', head: true, color: '#e0c080' }, { label: 'BLÄCK', text: 'GÖR DIG HALVBLIND OCH LÅNGSAM EN STUND.' },
    { label: 'RULLBAND', text: 'FÖR MED SIG DIG, FIENDERNA OCH FÖREMÅLEN. LOCKA FIENDER IN I SMÄLT METALL.' },
    { label: 'ÅNGVENTILER OCH STANSAR', text: 'VENTILERNA VÄSER INNAN DE BLÅSER. STANSARNA SLÅR NED VAR TREDJE SEKUND.' },
    { label: 'PULPETER', text: 'LÄS BOKEN (E): KARTAN, LÄKNING, RASERI ELLER KUNSKAP.' },
    { label: 'ARENARUM', text: 'GALLREN FÄLLS NED NÄR DU GÅR IN. DÖDA ALLA VÅGOR FÖR BELÖNINGEN.' },
    { label: 'LJUSSTRÅK OCH HONUNG', text: 'LJUSET VÄLSIGNAR DIG (MER SKADA). HONUNGEN KLIBBAR – HOPPA ÖVER.' },
    { label: 'BLODFUNTAR, KLOCKOR OCH LARVSÄCKAR', text: 'FUNTARNA LÄKER FIENDER – SLÅ SÖNDER DEM (E). KLOCKAN BEDÖVAR MEN VÄCKER ALLA. LARVSÄCKAR KLÄCKS NÄR DU KOMMER NÄRA – KROSSA DEM FÖRST (E).' },
    { label: 'VERSION 12', head: true, color: '#ff8060' }, { label: 'STILMÄTAREN', text: 'SYNS TILL HÖGER NÄR DU DÖDAR. VARIATION GER POÄNG, UPPREPNING OCH SKADA SÄNKER. HÖGRE NIVÅ GER MER GULD OCH ERFARENHET. KAN STÄNGAS AV I INSTÄLLNINGARNA.' },
    { label: 'AVRÄTTNING', text: 'EN VACKLANDE FIENDE (LYSER BLÅVITT) DÖR AV EN SPARK ELLER ETT NÄRSTRIDSSLAG. GER 15 HÄLSA OCH KORT OSÅRBARHET.' },
    { label: 'PARERING', text: 'V SPARKAR TILLBAKA SKOTT FRAMFÖR DIG. DE TRÄFFAR SKYTTEN MED DUBBEL SKADA OCH GER 10 HÄLSA.' },
    { label: 'ÖVERHÄLSA', text: 'AVRÄTTNINGAR OCH PARERINGAR KAN GE UPP TILL 150 % HÄLSA. ÖVERSKOTTET SJUNKER SAKTA.' },
    { label: 'BETYG', text: 'TID, DÖDADE, HEMLIGHETER, SKADA OCH STIL GER VÅNINGEN ETT BETYG. S GER 50 GULD.' },
    { label: 'VERSION 11', head: true, color: '#b0ffb8' }, { label: 'STUDSPLATTOR', text: 'KASTAR DIG LÅNGT I DEN RIKTNING DU GÅR. I LUFTEN NÅR FIENDERNA DIG INTE LIKA LÄTT.' },
    { label: 'SPORPÖLAR', text: 'VÄNDER PÅ STYRNINGEN EN STUND OCH GER SYNER AV FIENDER SOM INTE FINNS. MYCELBESTAR LÄKER SIG I DEM.' },
    { label: 'SPEGLAR', text: 'SPEGELVÄGGAR STUDSAR SKOTT – DINA OCH FIENDERNAS. KULOR KAN TRÄFFA FIENDER RUNT HÖRN.' },
    { label: 'TELEPORTRAR', text: 'GÅR I PAR. KLIV I DEN ENA OCH KOM UT UR DEN ANDRA.' },
    { label: 'SPEGELSKÖLDEN', text: 'HÅLL HÖGER MUSKNAPP (LT) FÖR ATT HÅLLA UPP SKÖLDEN. SKOTT FRAMIFRÅN STUDSAR TILLBAKA. HÖJ DEN PRECIS INNAN TRÄFFEN FÖR ATT PARERA.' },
    { label: 'VERSION 9', head: true, color: '#ffe0a0' }, { label: 'TOMRUMMET', text: 'I MOLNBORGEN KAN DU FALLA MELLAN ÖARNA. DU HAMNAR PÅ SENASTE SÄKRA PLATS MED SKADA. FIENDER SOM KNUFFAS UT DÖR.' },
    { label: 'TIDSBUBBLOR', text: 'ALLT I EN TIDSBUBBLA RÖR SIG LÅNGSAMT – DU, FIENDERNA OCH SKOTTEN.' },
    { label: 'ÅSKA', text: 'GLÖDANDE MARK BETYDER ATT BLIXTEN SNART SLÅR NED. BLIXTSTÄNGER DRAR TILL SIG DEN.' },
    { label: 'SPJUTET', text: 'VÄNSTERKLICK STÖTER, HÖGERKLICK KASTAR. GÅ ÖVER SPJUTET FÖR ATT PLOCKA UPP DET.' },
    { label: 'VERSION 8', head: true, color: '#c0a0ff' }, { label: 'TALANGER', text: 'DÖDA FÖR ERFARENHET. NY NIVÅ: VÄLJ EN AV TRE TALANGER (1–3, R SLÅR OM, T VISAR TRÄDET). TALANGALTARE (Ġ) OCH KUNSKAPSBÖCKER GER MER.' },
    { label: 'VATTEN', text: 'I DJUPT VATTEN SIMMAR DU LÅNGSAMT OCH KAN INTE HOPPA. LUFTMÄTAREN TÖMS – LUFTBUBBLOR FYLLER PÅ. TIDVATTNET GÖR GRUNT VATTEN DJUPT EMELLANÅT.' },
    { label: 'KRISTALLER', text: 'SKJUT PÅ EN BRYTANDE KRISTALL SÅ DELAS SKOTTET I TRE STRÅLAR. KRISTALLSPIKAR SKADAR – HOPPA ÖVER.' },
    { label: 'HARPUNEN', text: 'TRÄFFAR DU EN FIENDE DRAS DEN TILL DIG. TRÄFFAR DU EN VÄGG DRAS DU DIT.' },
    { label: 'VERSION 7', head: true, color: '#ffd070' }, { label: 'SMYG', text: 'ÖGAT OCH ÖRAT I HÖRNET VISAR HUR SYNLIG OCH HÖRBAR DU ÄR. FIENDER FYLLER EN MÄTARE (? SEDAN !!) INNAN DE SER DIG. DUCKA I MÖRKER, KASTA STENAR MED G OCH SLÅ BAKIFRÅN FÖR ATT DÖDA DIREKT.' },
    { label: 'FICKLAMPAN', text: 'L TÄNDER OCH SLÄCKER. BATTERIET RÄCKER EN STUND; BATTERIER (¼) LADDAR. LJUSET SKRÄMMER BANSHEER MEN SYNS PÅ LÅNGT HÅLL.' },
    { label: 'GRAVKAMMAREN', text: 'HOPPA UR KVICKSANDEN. SPRING FRÅN STENBLOCKEN. SOLEN BRÄNNER – SKUGGAN SVALKAR. SARKOFAGER GER SKATT ELLER EN MUMIE.' },
    { label: 'KRÖNIKAN', text: 'SIDORNA SPARAS MELLAN RUNDOR OCH GER SJÄLAR FÖRSTA GÅNGEN. NÄR ALLA ÄR HITTADE VÄNTAR EN HEMLIG SIDA.' },
    { label: 'VAPENVANA', text: 'VARJE VAPEN GÅR UPP I NIVÅ (1–5) NÄR DU ANVÄNDER DET. VARJE NIVÅ GER 4 % MER SKADA.' },
    { label: 'VERSION 6', head: true, color: '#ffb070' }, { label: 'RUNOR', text: 'RUNSTENAR (ª) GER RUNOR. EN RUNA PER VAPEN: ELD TÄNDER, IS SAKTAR NED, GIFT FÖRGIFTAR, STORM SLÅR NED BLIXT, BLOD HELAR, EKO UPPREPAR.' },
    { label: 'LÄGERELDEN', text: 'EN SAK PER ELD: VILA, SMIDA, FÖRÄDLA ETT KORT ELLER LAGA MAT AV KÖTT FRÅN DJUR.' }, { label: 'ANSLAGSTAVLAN', text: 'TRE SIDOUPPDRAG PER VÅNING MED GULD, KORT ELLER RUNOR SOM BELÖNING.' },
    { label: 'FÖRMÅGOR', text: 'KORT MÄRKTA AKTIV GER EN FÖRMÅGA PÅ T (STJÄRNKNAPPEN PÅ MOBIL). DÖDANDEN LADDAR DEN SNABBARE.' }, { label: 'VULKANEN', text: 'HETTAN STIGER NÄRA LAVA – VATTEN OCH ISDRYCKEN KYLER. SE UPP FÖR LAVABOMBER.' },
    { label: 'BÅGEN', text: 'HÅLL FÖR ATT SPÄNNA, SLÄPP FÖR ATT SKJUTA. FULLT SPÄND GÖR DUBBEL SKADA. PLOCKA UPP PILARNA IGEN.' }, { label: 'BLIXTSTAVEN', text: 'MANAN LADDAS AV SIG SJÄLV. HÖGERKLICK LADDAR ETT BLIXTKLOT. BLIXTEN LEDER I VATTEN.' }, { label: 'UTMANINGEN', text: 'TRE VÅGOR – BELÖNING: KISTA, GULD OCH KORT.' }], () => refreshTitle());
}
function showCodex() { const sets = s => new Set(s || []); CardUI.codex(Cards.ALL.filter(c => !c.weapon), { seen: sets(profile.cardsSeen), owned: sets(run ? run.owned : []), unlocked: new Set(Cards.ALL.filter(c => !c.unlock || profile.unlocked.includes(c.id)).map(c => c.id)), picks: profile.cardPicks || {} }, () => refreshTitle()); }
function showAchievements() {
  const got = profile.ach || [];
  CardUI.list('PRESTATIONER', `${got.length} AV ${ACH.length} · VARJE GER 10 SJÄLAR`, ACH.map(([id, name, text, , prog]) => { const pr = prog && !got.includes(id) ? prog(profile) : null; // framsteg för räknande prestationer
    return { label: (got.includes(id) ? '★ ' : '☆ ') + name, text: text + (pr ? ` (${Math.min(pr[0], pr[1])}/${pr[1]})` : '') + (got.includes(id) && (profile.achD || {})[id] ? ' · ' + profile.achD[id] : ''), color: got.includes(id) ? '#ffd24a' : '', dim: !got.includes(id) }; }), () => refreshTitle());
}
function enemyIcon(t, dark) { // första bilden i fiendens stillastående animation
  try { const f = enemyFrames[t] && enemyFrames[t].idle[0]; if (!f) return null; const c = document.createElement('canvas'); c.width = f.w; c.height = f.h; const g = c.getContext('2d'), im = g.createImageData(f.w, f.h);
    new Uint32Array(im.data.buffer).set(dark ? f.data.map(v => v >>> 24 ? 0xff201810 : 0) : f.data); g.putImageData(im, 0, 0); return c.toDataURL(); } catch (e) { return null; }
}
function showBestiary() {
  const b = profile.bestiary || {};
  const by = profile.deathsBy || {};
  const rows = Object.entries(ENEMY_DEFS).map(([t, d]) => b[t] ? { img: enemyIcon(t), label: d.name, text: `${WEAK[t] ? 'SVAGHET: ' + WEAK[t] + ' · ' : ''}DÖDADE ${b[t]}${by[d.name] ? ` · DÖDADE DIG ${by[d.name]}` : ''} · HP ${d.hp} · SKADA ${d.dmg} · FART ${d.speed}` + (d.tip ? ' · ' + d.tip : '') + ((profile.bestBiomes || {})[t] ? ' · FINNS I: ' + profile.bestBiomes[t].map(x => BIOME_NAME[x] || x).join(', ') : '') } : { img: enemyIcon(t, true), label: '???', text: 'INTE MÖTT ÄNNU', dim: true });
  for (const [id, bd] of Object.entries(BOSSES)) { const n = (profile.bossWins || {})[id] || 0; rows.push(n ? { label: bd.title || bd.name, text: `BESEGRAD ${n} GÅNG${n > 1 ? 'ER' : ''}`, color: '#ff8a5a' } : { label: '??? (BOSS)', text: 'INTE BESEGRAD', dim: true }); }
  CardUI.list('BESTIARIUM', `${Object.keys(b).length} AV ${Object.keys(ENEMY_DEFS).length} FIENDER`, rows, () => refreshTitle());
}
function showProfile() {
  const h = profile.history || [], fmtT = t => `${Math.floor(t / 60)}:${String(Math.round(t % 60)).padStart(2, '0')}`;
  const fav = Object.entries(profile.wkills || {}).sort((a, b) => b[1] - a[1])[0];
  const rows = [
    { label: 'RUNDOR', text: `${profile.runs} (${profile.wins} SEGRAR)` },
    { label: 'DÖDADE FIENDER', text: String(profile.kills || 0) },
    { label: 'SPELTID', text: fmtT(profile.time || 0) },
    { label: 'BÄSTA VÅNING', text: String(profile.bestDepth) },
    { label: 'FAVORITVAPEN', text: fav ? `${(WEAPONS.find(w => w.id === fav[0]) || {}).name || fav[0]} (${fav[1]})` : '–' },
    { label: 'PRESTATIONER', text: `${(profile.ach || []).length} AV ${ACH.length}` },
    { label: 'SNABBASTE SEGER', text: profile.fastestWin ? fmtT(profile.fastestWin) : '–' },
    { label: 'UPPSTIGNING', text: `HÖGSTA ${profile.ascMax || 0}` },
    { label: 'TOTAL SKADA', text: String(profile.totalDmg || 0) }, { label: 'LÄNGSTA KOMBO', text: String(profile.bestCombo || 0) },
    { label: 'FLEST PÅ EN VÅNING', text: String(profile.bestFloorKills || 0) }, { label: 'FLEST I EN RUNDA', text: String(profile.bestRunKills || 0) },
    { label: 'HUVUDTRÄFFAR', text: String(profile.headshots || 0) }, { label: 'DRYCKER', text: `${profile.potions_n || 0} DRUCKNA · ${(profile.potions || []).length} AV 5 KÄNDA` },
    { label: 'PER VAPEN', head: true, color: '#ffd24a' }, ...Object.entries(profile.wkills || {}).sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ label: (WEAPONS.find(w => w.id === k) || {}).name || k, text: `${v} DÖDADE` })),
    { label: 'PER BIOM', head: true, color: '#ffd24a' }, ...Object.entries(profile.biomeFloors || {}).map(([k, v]) => ({ label: BIOME_NAME[k] || k, text: `${v} VÅNINGAR KLARADE` })),
    { label: 'BOSSREKORD', head: true, color: '#ffd24a' }, ...Object.entries(profile.bossTimes || {}).map(([k, v]) => ({ label: (BOSSES[k] || {}).name || k, text: 'BÄSTA TID ' + fmtT(v) })),
    ...(store.get('errors', []).length ? [{ label: 'SENASTE FEL (SKICKA GÄRNA EN SKÄRMBILD)', head: true, color: '#ff7060' }, ...store.get('errors', []).slice(0, 3).map(e => ({ label: e.msg.toUpperCase().slice(0, 60), text: `${new Date(e.t).toLocaleString('sv-SE')} · VÅNING ${e.depth ?? '?'} · ${(e.stack || '').slice(0, 160)}`, dim: true })),
      { label: 'KOPIERA FELRAPPORTEN', text: 'KLICKA FÖR ATT KOPIERA ALLA FEL TILL URKLIPP', color: '#ffb080', onClick: () => { try { navigator.clipboard.writeText(JSON.stringify({ version: 5, ua: navigator.userAgent, errors: store.get('errors', []) }, null, 1)); CardUI.toast && CardUI.toast(null, 'FELRAPPORTEN ÄR KOPIERAD'); } catch (e) { /* inget urklipp */ } } }] : []),
    { label: 'DAGENS RUNDA – TOPPLISTA', head: true, color: '#ffd24a' }, ...(profile.dailyTop || []).slice(0, 5).map((d, i) => ({ label: `${i + 1}. ${d.score} P`, text: `${d.d} · VÅNING ${d.depth}` })),
    { label: 'TOPP 5', head: true, color: '#ffd24a' },
    ...h.slice().sort((a, b) => b.score - a.score).slice(0, 5).map((r, i) => ({ label: `${i + 1}. ${r.score} P`, text: `VÅNING ${r.depth} · ${r.kills} DÖDADE · FRÖ ${r.seed}${r.win ? ' · SEGER' : ''}` })),
    { label: 'SENASTE RUNDOR', head: true, color: '#ffd24a' },
    ...h.slice(0, 10).map(r => ({ label: `${r.win ? 'SEGER' : r.cause === 'GAV UPP' ? 'GAV UPP' : 'DOG'} VÅNING ${r.depth}`, text: [r.cls && CLASSES[r.cls] ? CLASSES[r.cls].name : '', r.biomes && r.biomes.length > 1 ? r.biomes.map(b => (BIOME_NAME[b] || b).slice(0, 4)).join('→') : BIOME_NAME[r.biome] || '', r.cmode ? cmodeNames(r.cmode) : '', r.cause && r.cause !== 'GAV UPP' ? 'DÖDAD AV ' + r.cause : '', r.daily ? 'DAGENS' : '', DIFF[r.diff ?? 1] ? DIFF[r.diff ?? 1].name : ''].filter(Boolean).join(' · '), dim: !r.win })),
  ];
  CardUI.list('PROFIL', '', rows, () => refreshTitle());
}
const DIFF = [ // index 4 = berättelseläget (visas först)
  { name: 'LÄTT', dmg: 0.55, hp: 0.8, ammo: 1.4, speed: 0.9, souls: 0.7 },
  { name: 'NORMAL', dmg: 1, hp: 1, ammo: 1, speed: 1, souls: 1 },
  { name: 'SVÅR', dmg: 1.45, hp: 1.3, ammo: 0.75, speed: 1.12, souls: 1.5 },
  { name: 'MARDRÖM', dmg: 1.9, hp: 1.6, ammo: 0.6, speed: 1.22, souls: 2.2 },
  { name: 'BERÄTTELSE', dmg: 0.3, hp: 0.6, ammo: 1.8, speed: 0.85, souls: 0.4 },
];
const diff = () => DIFF[settings.diff];

