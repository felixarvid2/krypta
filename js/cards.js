'use strict';
// KRYPTA – kortdata för roguelike-läget.
// Kort är ren data: varje kort har en `mods`-tabell med nycklar ur MOD_KEYS, och spelet
// tolkar summan (computeMods). Inga kort har egen kod, så nya kort = ny data.
(() => {
const RARITY = {
  vanlig:      { label: 'VANLIG',      color: '#c9a87a', weight: 60, price: 40 },
  ovanlig:     { label: 'OVANLIG',     color: '#6fc26a', weight: 28, price: 70 },
  sallsynt:    { label: 'SÄLLSYNT',    color: '#5aa0e8', weight: 10, price: 120 },
  legendarisk: { label: 'LEGENDARISK', color: '#ffd24a', weight: 2,  price: 200 },
};
const RARITY_ORDER = ['vanlig', 'ovanlig', 'sallsynt', 'legendarisk'];

// Alla effekter spelet förstår. Värden summeras över alla ägda kort.
const MOD_KEYS = {
  dmg: 'Andel extra skada (0,2 = +20 %)',
  fireRate: 'Andel högre eldhastighet',
  reloadSpeed: 'Andel snabbare omladdning',
  magSize: 'Andel större magasin',
  accuracy: 'Andel mindre spridning',
  moveSpeed: 'Andel högre rörelsehastighet',
  maxHp: 'Extra max-HP (platt)',
  armorPerFloor: 'Rustning som ges vid varje ny våning',
  regen: 'HP per sekund',
  lifesteal: 'Andel av skadan som blir HP',
  critChance: 'Kritchans (0-1)',
  critDmg: 'Extra kritskada utöver grundkrit x2',
  pierce: 'Antal fiender kulan går igenom',
  extraPellets: 'Extra hagel/kulor per skott',
  explodeChance: 'Chans (0-1) till liten explosion vid träff',
  burnChance: 'Chans (0-1) att fienden brinner',
  slowChance: 'Chans (0-1) att fienden saktas ned',
  killHeal: 'HP per dödad fiende',
  killArmor: 'Rustning per dödad fiende',
  goldMul: 'Andel extra guld',
  ammoMul: 'Andel extra ammo från upplockning',
  healMul: 'Andel extra helning',
  dodge: 'Chans (0-1) att undvika skada',
  thorns: 'Skada tillbaka på närstridsangripare',
  damageTaken: 'Andel skada man tar (negativt = mindre)',
  projectileResist: 'Andel mindre skada från eldklot',
  meleeResist: 'Andel mindre närstridsskada',
  magnet: 'Extra räckvidd (rutor) för att dra till sig föremål',
  luck: 'Bättre kort och fynd',
  extraLife: 'Antal återupplivningar med halva HP',
  ammoSave: 'Chans (0-1) att skottet inte kostar ammo',
  shield: 'Sköldpoäng som laddas efter 4 s utan skada',
  light: 'Extra ljus i mörkret',
  secretSense: 'Hemliga väggar syns på kartan (1 = på)',
  cardChoices: 'Extra val vid kortdragning',
  shopDiscount: 'Andel rabatt i butiken',
  bossDmg: 'Andel extra skada mot bossar och elitfiender',
  firstShot: 'Andel extra skada på första skottet i magasinet',
  lowHpDmg: 'Andel extra skada när HP < 35 %',
  speedOnKill: 'Sekunder snabbare rörelse efter dödande',
  execute: 'Vanliga fiender under denna andel HP dör direkt',
  grenades: 'Extra max granater (platt)',
  grenadeDmg: 'Andel extra granatskada',
  stamina: 'Andel mer uthållighet',
  dashCd: 'Andel kortare återhämtning för rusning',
  airDmg: 'Andel extra skada medan man är i luften (hopp)',
  backstab: 'Andel extra skada mot fiender som inte sett dig',
  comboGold: 'Extra guld per steg i kombomätaren (platt)',
  trapResist: 'Andel mindre skada från fällor, lava och gas',
  freezeChance: 'Chans (0-1) att frysa fienden',
  poisonChance: 'Chans (0-1) att förgifta',
  shockChance: 'Chans (0-1) att en blixt hoppar till en närliggande fiende',
  interest: 'Andel ränta på guldet vid varje ny våning (max 30 guld)',
  floorHeal: 'HP som ges vid varje ny våning',
  killExplode: 'Chans (0-1) att dödade fiender exploderar',
  reloadNova: 'Skada i en stöt runt dig när du laddar om (platt, 0 = av)',
  eliteGold: 'Andel extra guld från eliter och väktare',
  trapSense: 'Fällor syns på kartan (1 = på)',
  enemySense: 'Fiender syns på kartan genom väggar (1 = på)',
  critHeal: 'HP per kritisk träff',
  dashDmg: 'Skada på fiender man rusar igenom (platt)',
  shieldOnKill: 'Sköldpoäng per dödad fiende',
  ammoRegen: 'Andel av ett magasin som fylls på per sekund i reserven',
  knockback: 'Andel större knuff vid träff',
  chestChoice: 'Extra val i kistor (platt)',
  freeReroll: 'Gratis "nya kort" i butiken per våning (platt)',
  hazardImmune: 'Immun mot lava, vatten, is och nät (1 = på)',
  doubleJump: 'Dubbelhopp (1 = på)',
  // version 5: drycker, följeslagare, närstrid, brand, kyla, huvudträffar och blödning
  potionPower: 'Andel starkare drycker',
  potionChance: 'Andel fler drycker',
  petPower: 'Andel starkare följeslagare',
  meleeDmg: 'Andel extra närstridsskada',
  fireDmg: 'Andel extra brandskada',
  coldResist: 'Andel mindre köld- och frostskada',
  headshot: 'Andel extra skada vid huvudträff',
  bleedChance: 'Chans (0-1) till blödning',
  allyChance: 'Chans (0-1) att en dödad fiende reser sig som allierad en stund',
  lightRadius: 'Extra ljusradie (platt)',
  weaponDrop: 'Chans (0-1) att eliter tappar vapen',
  npcDiscount: 'Andel rabatt hos alkemisten och prästen',
  // runor, hetta, mana, pilar, uppdrag, lägereld, förmågor, hemligheter och måltider
  runeSlots: 'Extra runplatser (platt)',
  runePower: 'Andel starkare runor',
  heatResist: 'Andel mindre hetta och brandskada på dig',
  manaRegen: 'Andel snabbare mana',
  arrowRetrieve: 'Chans (0-1) att pilen kommer tillbaka',
  questGold: 'Andel mer guld från uppdrag',
  campfireHeal: 'Andel bättre vila vid lägerelden',
  activeCd: 'Andel kortare nedräkning för den aktiva förmågan',
  secretChance: 'Chans (0-1) till fler hemliga trappor',
  mealPower: 'Andel starkare måltider',
  // version 7: smyg, mörker, lampan, spel, banken, vapenvana, krönikesidor och gravskatter
  stealthDmg: 'Andel extra skada mot ovetande fiender (smyganfall)',
  noiseReduce: 'Andel mindre ljud du för',
  detectSlow: 'Andel långsammare upptäckt',
  lampBattery: 'Andel längre batteritid för lampan',
  lampRadius: 'Extra ljusradie för lampan (platt)',
  gambleLuck: 'Andel bättre odds hos spelaren',
  bankInterest: 'Andel extra ränta på banken',
  masteryXp: 'Andel snabbare vapenvana',
  pageSouls: 'Extra själar per krönikesida (platt)',
  goldFind: 'Andel mer guld från högar och sarkofager',
  // version 8: simning, luft, erfarenhet, talanger, kristaller, vatten, Avgrunden och häxor
  swimSpeed: 'Andel snabbare simning i djupt vatten',
  airMax: 'Extra sekunder luft under vattnet (platt)',
  xpMul: 'Andel mer erfarenhet',
  talentChoice: 'Extra alternativ vid varje talangval (platt)',
  crystalDmg: 'Andel extra skada mot kristallfiender och kristaller',
  waterDmg: 'Andel extra skada när du står i vatten',
  refract: 'Extra delning när skott träffar brytande kristaller (platt)',
  abyssSouls: 'Andel fler själar i Avgrunden',
  witchResist: 'Andel kortare förbannelser (häxor)',
  levelHeal: 'HP som ges vid varje ny nivå (platt)',
  // version 9: Klocktornet och Molnborgen – tidsbubblor, vind, fall, åska, knuff, kugghjul och urverk
  // (extra hopp i luften finns redan som doubleJump)
  timeResist: 'Andel mindre effekt av tidsbubblor (de saktar in dig mindre)',
  windResist: 'Andel mindre knuff från vind och vindbyar',
  fallSafe: 'Andel mindre fallskada när du faller i tomrummet',
  lightningResist: 'Andel mindre blixtskada (åska och stormkallare)',
  pushDmg: 'Andel extra skada när fiender knuffas in i väggar',
  gearFind: 'Andel fler kugghjul',
  clockSlow: 'Chans (0-1) att träffade fiender saktas in en stund',
  skyGold: 'Andel mer guld i Molnborgen',
  rewindHeal: 'HP du läker när du dödar en urverkssoldat (platt)',
  // version 11: Svampriket och Spegelpalatset – sporer, studsplattor, teleporter, spegelväggar, illusioner, glas och piskan
  sporeResist: 'Andel mindre effekt av sporer och förvirring (sporpölar, sporlingar)',
  bounceHeight: 'Andel högre studs från studsplattor (svamphattar)',
  teleportShield: 'Sekunder osårbarhet efter en teleport (platt)',
  reflectDmg: 'Andel extra skada på skott som studsat mot spegelväggar eller skölden',
  illusionSight: 'Chans (0-1) att direkt se igenom illusioner (illusionistens falska kopior)',
  mirrorShards: 'Chans (0-1) att dödade fiender splittras i skärvor som skadar fiender runt omkring',
  fungusHeal: 'HP du läker när du dödar en svampfiende (platt)',
  whipReach: 'Extra räckvidd i rutor för piskan och närstrid (platt)',
  // version 13: Det förbjudna biblioteket och Gjuteriet – bläck, rullband, ångventiler, runor, ånga, pulpeter, gjuterifiender och stansar
  inkResist: 'Andel mindre effekt av bläck (bläckpölar och bläckslem: mindre mörker i kanten och mindre inbromsning)',
  beltSpeed: 'Andel högre fart på rullband som går åt rätt håll (samma håll som du rör dig)',
  ventResist: 'Andel mindre skada och knuff från ångventiler och ånga (ångautomaternas ångkon)',
  runeDmg: 'Andel extra skada med runor (runbokens målsökande runor)',
  steamDmg: 'Andel extra skada med ånga (ångkanonen och skållning)',
  bookLore: 'Extra effekt när du läser en pulpet (platt: varje steg gör bokens tillfälliga bonus starkare och längre)',
  forgeArmor: 'Rustning per dödad gjuterifiende (smältgolem, ångautomat, gnistdrönare; platt)',
  pressResist: 'Andel mindre skada från stansar, pressar och andra fällor',
  // version 15: Blodkatedralen och Bikupan – ljusstråk, välsignelse, honung, larver, rökelsekaret, bin, klockor och blodfuntar
  blessDur: 'Andel längre välsignelse från ljusstråk (de blyinfattade fönstrens färgade ljus på golvet)',
  honeyResist: 'Andel mindre inbromsning i honung (klibbiga honungsrutor)',
  larvaDmg: 'Andel extra skada mot larver och larvsäckar',
  censerHeal: 'Extra HP du läker per träff med rökelsekaret (platt)',
  beeDmg: 'Andel extra skada med bin (bikastarens bin och drottningar)',
  bellStun: 'Extra sekunder bedövning när du ringer i en klocka (platt)',
  fontBreak: 'HP du läker när du slår sönder en blodfunt (platt)',
  holyDmg: 'Andel extra skada medan du är välsignad (efter ett ljusstråk)',
  // version 16: Den döda trädgården och Drömriket – taggrankor, stenänglar, saxen, drömstaven, sömnens dimma, fontäner, glidande väggar och sömn
  thornResist: 'Andel mindre skada från taggrankor (taggrankornas rutor och de rotade taggrankorna)',
  angelSight: 'Extra sekunder som stenänglar står kvar efter att du tittat bort (platt)',
  shearDmg: 'Andel extra skada med trädgårdssaxen (klippen och kastet)',
  dreamDmg: 'Andel extra skada med drömstaven (stjärnan och sömnsmällen)',
  mistSight: 'Andel längre synvidd i sömnens dimma (fiender syns på längre avstånd)',
  fountainHeal: 'Extra HP du läker när du dricker ur en fontän (platt)',
  shiftSense: 'Andel kortare tid som glidande väggar står stängda (de öppnas snabbare)',
  sleepResist: 'Andel mindre effekt av sömn och dåsighet (sömnens dimma, sömnpulver och drömstjärnor)',
  // version 17: Spökskeppet och Laboratoriet – sköljt däck, kanoner, kedjekulor, syra, transmutation, teslaspolar och alembiker
  deckGrip: 'Andel mer grepp på sköljt däck (mindre halka och mindre knuff av vågorna)',
  cannonDmg: 'Andel extra skada med kanoner (kanonkulan och smällen)',
  chainDmg: 'Andel extra skada med kedjekulekanonen',
  acidDmg: 'Andel extra skada med syra (syrasprutan, syrapölar och syrakar mot fiender)',
  acidResist: 'Andel mindre skada av syra (syrakar, slemmets syrapölar och frätningen av rustningen)',
  transmuteLuck: 'Andel tur med transmutation: fiender är av guld längre och ger mer guld, och cirkelns dryck kommer oftare',
  teslaResist: 'Andel mindre skada från teslaspolarnas blixtar',
  brewLuck: 'Chans att alembiken brygger en stark dryck',
  // version 18: Cirkusen och Djungeltemplet – rampljus, fallluckor, knivar, käglor, giftpilar, gift, idoler och lianer
  showtime: 'Andel extra skada när du står i strålkastarens rampljus (utöver de vanliga 25 %)',
  trapdoorSense: 'Andel längre varning innan fallluckorna öppnas, och mindre skada när du faller genom en',
  knifeResist: 'Andel mindre skada av knivar (knivkastare, knivkastarhjul och direktörens knivar)',
  pinDmg: 'Andel extra skada med käglekastarens käglor',
  dartDmg: 'Andel extra skada med blåsrörets giftpilar',
  poisonResist: 'Andel mindre gift: giftpilar, giftblommor och giftmoln förgiftar dig kortare tid',
  idolLuck: 'Andel tur med idoler och lyckohjul: mer guld ur guldidolen, färre i bakhållet och bättre snurr',
  vineWalk: 'Andel mindre inbromsning i lianer',
};
const KEYS = Object.keys(MOD_KEYS);

// [id, namn, rarity, mods, max, text, extra]  – id = bildens filnamn (assets/cards/<id>.png)
// text: en effekt per rad (\n). Förbannade kort har `bad` = antal avslutande rader som är nackdelar.
const DEFS = [
  // ---- VANLIGA: små steg ----
  ['slipstenen', 'SLIPSTENEN', 'vanlig', { dmg: 0.10 }, 5, '+10 % SKADA'],
  ['kantvakten', 'KAMPSKÖLDEN', 'vanlig', { maxHp: 10 }, 5, '+10 MAX HP'],
  ['stovelremmen', 'BUNDNA STÖVLAR', 'vanlig', { moveSpeed: 0.07 }, 4, '+7 % RÖRELSEHASTIGHET'],
  ['ljuslykta', 'PAPPERSLYKTAN', 'vanlig', { light: 0.25 }, 3, '+25 % LJUS I MÖRKRET'],
  ['kompassen', 'DEN ROSTIGA KOMPASSEN', 'vanlig', { accuracy: 0.12 }, 4, '+12 % TRÄFFSÄKERHET'],
  ['lagerelden', 'LÄGERELDENS GLÖD', 'vanlig', { regen: 0.3 }, 3, '+0,3 HP PER SEKUND'],
  ['blomkrukan', 'GRAVBLOMMOR', 'vanlig', { healMul: 0.15 }, 3, '+15 % HELNING'],
  ['reservfickan', 'FLICKADE FICKAN', 'vanlig', { ammoMul: 0.15 }, 3, '+15 % AMMO FRÅN FÖREMÅL'],
  ['guldbaggen', 'GRAVSKARABÉN', 'vanlig', { goldMul: 0.15 }, 3, '+15 % GULD'],
  ['ledaren', 'DRAGSTENEN', 'vanlig', { magnet: 1 }, 3, '+1 RUTA RÄCKVIDD FÖR FÖREMÅL'],
  ['regnbagsfjadern', 'BLODIG FJÄDER', 'vanlig', { dodge: 0.04 }, 4, '+4 % CHANS ATT UNDVIKA SKADA'],
  ['murbruket', 'GRAVMURBRUK', 'vanlig', { armorPerFloor: 5 }, 3, '+5 RUSTNING VID VARJE VÅNING'],
  ['stenhjartat', 'STENHJÄRTAT', 'vanlig', { meleeResist: 0.08 }, 3, '-8 % NÄRSTRIDSSKADA'],
  ['tillbakablicken', 'BAKVÄNDA TIMGLASET', 'vanlig', { reloadSpeed: 0.12 }, 4, '+12 % LADDNINGSHASTIGHET'],
  // ---- OVANLIGA ----
  ['ekot', 'KRYPTKLOCKAN', 'ovanlig', { fireRate: 0.12 }, 3, '+12 % ELDHASTIGHET'],
  ['gravstenen', 'ASKURNAN', 'ovanlig', { magSize: 0.25 }, 2, '+25 % MAGASINSSTORLEK'],
  ['lodet', 'SJUNKNA ANKARET', 'ovanlig', { projectileResist: 0.2 }, 2, '-20 % SKADA FRÅN ELDKLOT'],
  ['korsriddaren', 'KORSFARARENS SVÄRD', 'ovanlig', { critChance: 0.08 }, 4, '+8 % KRITCHANS'],
  ['offerkniven', 'OFFERKNIVEN', 'ovanlig', { critDmg: 0.4 }, 3, '+40 % KRITSKADA'],
  ['glodkol', 'GLÖDKOLET', 'ovanlig', { burnChance: 0.15 }, 3, '15 % CHANS ATT SÄTTA FIENDEN I BRAND'],
  ['manesilver', 'MÅNSILVER', 'ovanlig', { slowChance: 0.15 }, 3, '15 % CHANS ATT SAKTA NED FIENDEN'],
  ['spegelskarvan', 'SPEGELSKÄRVAN', 'ovanlig', { thorns: 4 }, 3, 'NÄRSTRIDSANGRIPARE TAR 4 SKADA'],
  ['vandraren', 'VANDRARENS LYKTA', 'ovanlig', { secretSense: 1 }, 1, 'HEMLIGA VÄGGAR SYNS PÅ KARTAN', { unlock: 10 }],
  ['fyrklovern', 'FYRKLÖVERN', 'ovanlig', { luck: 0.1 }, 3, '+10 % LYCKA: BÄTTRE KORT OCH FYND'],
  ['hjartstenen', 'BLÖDANDE HJÄRTSTEN', 'ovanlig', { maxHp: 25 }, 3, '+25 MAX HP'],
  ['seansen', 'SÉANSLJUSET', 'ovanlig', { killHeal: 1 }, 3, 'DÖDADE FIENDER GER 1 HP'],
  ['karnan', 'RUNMÅLTAVLAN', 'ovanlig', { firstShot: 0.5 }, 3, '+50 % SKADA PÅ FÖRSTA SKOTTET', { unlock: 10 }],
  ['tjuren', 'BRONSTJUREN', 'ovanlig', { bossDmg: 0.25 }, 3, '+25 % SKADA MOT BOSSAR OCH ELIT'],
  ['loparen', 'NATTLÖPAREN', 'ovanlig', { speedOnKill: 1.5 }, 3, 'SNABBARE I 1,5 S EFTER DÖDANDE'],
  ['rostad_mandel', 'ROSTADE MANDLAR', 'ovanlig', { ammoSave: 0.08 }, 3, '8 % CHANS ATT SKOTT INTE KOSTAR AMMO'],
  ['offerdolken', 'OFFERDOLKEN', 'ovanlig', { critChance: 0.2, maxHp: -15 }, 2, '+20 % KRITCHANS\n-15 MAX HP', { curse: true, bad: 1, unlock: 10 }],
  // ---- SÄLLSYNTA ----
  ['vampyren', 'VAMPYRENS KYSS', 'sallsynt', { lifesteal: 0.06 }, 3, '6 % AV SKADAN BLIR HP', { unlock: 30 }],
  ['trefaldigheten', 'TREFALDIGHETEN', 'sallsynt', { extraPellets: 1 }, 2, '+1 KULA PER SKOTT', { unlock: 30 }],
  ['falskspelaren', 'FALSKSPELARENS ÄS', 'sallsynt', { cardChoices: 1 }, 2, '+1 VAL VID KORTDRAGNING', { unlock: 40 }],
  ['marmorbrottet', 'DÖDGRÄVARENS SPADE', 'sallsynt', { execute: 0.12 }, 2, 'VANLIGA FIENDER UNDER 12 % HP DÖR DIREKT', { unlock: 25 }],
  ['glorian', 'HELGONSKENET', 'sallsynt', { shield: 20 }, 2, '+20 SKÖLD, LADDAS EFTER 4 S UTAN SKADA'],
  ['bronda_runan', 'BRÄNDA RUNAN', 'sallsynt', { explodeChance: 0.15, burnChance: 0.10 }, 2, '15 % EXPLOSIONSCHANS\n10 % BRANDCHANS', { unlock: 25 }],
  ['prisma', 'KRISTALLPRISMAN', 'sallsynt', { pierce: 1 }, 2, 'KULAN GÅR IGENOM +1 FIENDE'],
  ['packet', 'RÅTTAN MED MYNTET', 'sallsynt', { shopDiscount: 0.12 }, 3, '-12 % PRISER I BUTIKEN'],
  ['stenmuren', 'STENMUREN', 'sallsynt', { killArmor: 2 }, 2, 'DÖDADE FIENDER GER 2 RUSTNING'],
  ['fana', 'BLODIGA FANAN', 'sallsynt', { lowHpDmg: 0.6, maxHp: -20 }, 2, '+60 % SKADA UNDER 35 % HP\n-20 MAX HP', { curse: true, bad: 1 }],
  ['forbannade_kronan', 'DEN FÖRBANNADE KRONAN', 'sallsynt', { dmg: 0.4, damageTaken: 0.25 }, 1, '+40 % SKADA\n+25 % SKADA DU TAR', { curse: true, bad: 1, unlock: 20 }],
  ['midasmasken', 'MIDASMASKEN', 'sallsynt', { goldMul: 0.5, healMul: -0.3 }, 1, '+50 % GULD\n-30 % HELNING', { curse: true, bad: 1, unlock: 20 }],
  // ---- LEGENDARISKA: ändrar spelstilen ----
  ['askkungen', 'ASKKUNGENS EDSVÄR', 'legendarisk', { burnChance: 0.45, explodeChance: 0.2, dmg: 0.15 }, 1, '45 % BRANDCHANS\n20 % EXPLOSIONSCHANS\n+15 % SKADA', { unlock: 50 }],
  ['solkonungen', 'SOLKUNGENS SIGILL', 'legendarisk', { critChance: 0.25, critDmg: 1.0, light: 0.4 }, 1, '+25 % KRITCHANS\n+100 % KRITSKADA\n+40 % LJUS', { unlock: 60 }],
  ['gravvaktaren', 'GRAVVAKTARENS VILJA', 'legendarisk', { maxHp: 50, armorPerFloor: 15, damageTaken: -0.2, meleeResist: 0.15 }, 1, '+50 MAX HP\n+15 RUSTNING PER VÅNING\n-20 % SKADA DU TAR\n-15 % NÄRSTRIDSSKADA', { unlock: 40 }],
  ['vaktarbanan', 'NATTKORPEN', 'legendarisk', { fireRate: 0.3, reloadSpeed: 0.3, ammoSave: 0.15, moveSpeed: 0.1 }, 1, '+30 % ELDHASTIGHET\n+30 % LADDNING\n15 % GRATIS SKOTT\n+10 % RÖRELSE', { unlock: 50 }],
  ['spegelvannen', 'SPEGELVÄNNEN', 'legendarisk', { extraPellets: 2, pierce: 1, magSize: 0.2 }, 1, '+2 KULOR PER SKOTT\nGÅR IGENOM +1 FIENDE\n+20 % MAGASIN', { unlock: 45 }],
  ['ouroboros', 'OUROBOROS', 'legendarisk', { extraLife: 1, regen: 1, lifesteal: 0.05, healMul: 0.25 }, 1, '+1 ÅTERUPPLIVNING\n+1 HP PER SEKUND\n5 % AV SKADAN BLIR HP\n+25 % HELNING', { unlock: 60 }],
  // ---- NYA KORT (version 4): granater, rörelse, gift, frost, blixt, guld och skuggor ----
  // vanliga
  ['fyllbulten', 'MJÖDHORNET', 'vanlig', { stamina: 0.15 }, 4, '+15 % UTHÅLLIGHET'],
  ['fyrfoten', 'VARGTASSEN', 'vanlig', { dashCd: 0.12 }, 4, '12 % KORTARE ÅTERHÄMTNING\nFÖR RUSNING'],
  ['hornstenen', 'HÖRNSTENEN', 'vanlig', { trapResist: 0.2 }, 3, '-20 % SKADA FRÅN FÄLLOR,\nLAVA OCH GAS'],
  ['agget', 'DRAKÄGGET', 'vanlig', { grenades: 1 }, 3, '+1 MAX GRANAT'],
  ['benflojt', 'BENFLÖJTEN', 'vanlig', { grenadeDmg: 0.2 }, 3, '+20 % GRANATSKADA'],
  ['hangande_lappen', 'SKULDSEDELN', 'vanlig', { interest: 0.05 }, 3, '5 % RÄNTA PÅ GULDET VID\nVARJE NY VÅNING (MAX 30)'],
  ['gronskan', 'GRODDEN', 'vanlig', { floorHeal: 10 }, 3, '+10 HP VID VARJE NY VÅNING'],
  ['att_gora', 'KRÖNIKAN', 'vanlig', { comboGold: 1 }, 3, '+1 GULD PER KOMBOSTEG'],
  ['grodan', 'TRÄSKPADDAN', 'vanlig', { poisonChance: 0.12 }, 3, '12 % CHANS ATT FÖRGIFTA'],
  ['halvmane', 'HALVMÅNEN', 'vanlig', { backstab: 0.25 }, 3, '+25 % SKADA MOT\nOVETANDE FIENDER'],
  ['dominobrickan', 'BENTÄRNINGARNA', 'vanlig', { knockback: 0.3 }, 3, '+30 % KNUFF VID TRÄFF'],
  ['sollinsen', 'BRÄNNGLASET', 'vanlig', { critChance: 0.04, burnChance: 0.05 }, 3, '+4 % KRITCHANS\n5 % BRANDCHANS'],
  ['glasogat', 'SPRUCKNA LUPPEN', 'vanlig', { critHeal: 1 }, 3, '+1 HP PER KRITISK TRÄFF'],
  ['akrobaten', 'GYCKLARENS SKUGGA', 'vanlig', { airDmg: 0.2 }, 3, '+20 % SKADA I LUFTEN'],
  ['urtidsrunan', 'URTIDSURNAN', 'vanlig', { ammoRegen: 0.02 }, 3, '2 % AV ETT MAGASIN PER\nSEKUND TILL RESERVEN'],
  ['fyrkanten', 'RUNPLATTAN', 'vanlig', { shieldOnKill: 1 }, 3, '+1 SKÖLD PER DÖDAD FIENDE'],
  ['idolen', 'GULDIDOLEN', 'vanlig', { eliteGold: 0.3 }, 3, '+30 % GULD FRÅN ELIT\nOCH VÄKTARE'],
  ['moln_nio', 'FROSTMOLNET', 'vanlig', { freezeChance: 0.06 }, 3, '6 % CHANS ATT FRYSA FIENDEN'],
  ['askstav', 'ÅSKSTAVEN', 'vanlig', { shockChance: 0.08 }, 3, '8 % CHANS ATT EN BLIXT\nHOPPAR TILL EN GRANNE'],
  ['feltrycket', 'FALSKA TÄRNINGEN', 'vanlig', { freeReroll: 1, goldMul: -0.15 }, 1, '+1 GRATIS NYA KORT I\nBUTIKEN PER VÅNING\n-15 % GULD', { curse: true, bad: 1 }],
  // ovanliga
  ['spakvinnan', 'HÄXANS KRISTALL', 'ovanlig', { poisonChance: 0.18 }, 3, '18 % CHANS ATT FÖRGIFTA', { unlock: 15 }],
  ['kristallkronan', 'ISKRONAN', 'ovanlig', { freezeChance: 0.12 }, 2, '12 % CHANS ATT FRYSA FIENDEN', { unlock: 15 }],
  ['tankestormen', 'STORMHJÄRNAN', 'ovanlig', { shockChance: 0.15 }, 2, '15 % CHANS ATT EN BLIXT\nHOPPAR TILL EN GRANNE', { unlock: 20 }],
  ['inbrottstjuven', 'GRAVPLUNDRAREN', 'ovanlig', { backstab: 0.4, moveSpeed: 0.05 }, 2, '+40 % SKADA MOT\nOVETANDE FIENDER\n+5 % RÖRELSEHASTIGHET'],
  ['snedsteget', 'SPÖKTRAPPAN', 'ovanlig', { dashDmg: 15, dashCd: 0.1 }, 2, 'RUSNING GENOM FIENDER\nGÖR 15 SKADA\n10 % KORTARE ÅTERHÄMTNING'],
  ['spakortet', 'ALLSEENDE ÖGAT', 'ovanlig', { enemySense: 1 }, 1, 'FIENDER SYNS PÅ KARTAN\nGENOM VÄGGAR', { unlock: 20 }],
  ['avtrycket', 'FÄLLKARTAN', 'ovanlig', { trapSense: 1, trapResist: 0.1 }, 1, 'FÄLLOR SYNS PÅ KARTAN\n-10 % SKADA FRÅN FÄLLOR'],
  ['tomrummet', 'TOMRUMSRINGEN', 'ovanlig', { killExplode: 0.1 }, 3, '10 % CHANS ATT DÖDADE\nFIENDER EXPLODERAR'],
  ['trubaduren', 'DÖDSFIOLEN', 'ovanlig', { reloadNova: 15 }, 2, 'OMLADDNING GER EN STÖT\nSOM GÖR 15 SKADA RUNT DIG', { unlock: 15 }],
  ['lyckokatten', 'LYCKOKATTEN', 'ovanlig', { freeReroll: 1, luck: 0.05 }, 2, '+1 GRATIS NYA KORT I\nBUTIKEN PER VÅNING\n+5 % LYCKA'],
  ['sigillbrevet', 'SIGILLBREVET', 'ovanlig', { chestChoice: 1 }, 2, '+1 VAL I KISTOR', { unlock: 15 }],
  ['rotknuta', 'LIVSROTEN', 'ovanlig', { floorHeal: 20, regen: 0.2 }, 2, '+20 HP VID VARJE NY VÅNING\n+0,2 HP PER SEKUND'],
  ['schablonen', 'BÖDELNS MÅTT', 'ovanlig', { critChance: 0.06, critHeal: 2 }, 2, '+6 % KRITCHANS\n+2 HP PER KRITISK TRÄFF'],
  ['maskerna', 'DE TVÅ MASKERNA', 'ovanlig', { backstab: 0.6, damageTaken: 0.15 }, 1, '+60 % SKADA MOT\nOVETANDE FIENDER\n+15 % SKADA DU TAR', { curse: true, bad: 1, unlock: 20 }],
  ['baronen', 'BARONENS HATT', 'ovanlig', { eliteGold: 0.4, shopDiscount: 0.05 }, 2, '+40 % GULD FRÅN ELIT\nOCH VÄKTARE\n-5 % PRISER I BUTIKEN'],
  // sällsynta
  ['vandringsstaven', 'FROSTSTAVEN', 'sallsynt', { freezeChance: 0.15, slowChance: 0.1 }, 2, '15 % CHANS ATT FRYSA\n10 % CHANS ATT SAKTA NED', { unlock: 25 }],
  ['bryggan', 'BRON ÖVER AVGRUNDEN', 'sallsynt', { hazardImmune: 1 }, 1, 'IMMUN MOT LAVA, VATTEN,\nIS OCH NÄT', { unlock: 30 }],
  ['kubtornet', 'VAKTTORNET', 'sallsynt', { shield: 10, shieldOnKill: 2 }, 2, '+10 SKÖLD\n+2 SKÖLD PER DÖDAD FIENDE'],
  ['spadomskulan', 'ÖDESKULAN', 'sallsynt', { chestChoice: 1, luck: 0.1 }, 1, '+1 VAL I KISTOR\n+10 % LYCKA', { unlock: 30 }],
  ['glad_trefot', 'SKRATTBOMBEN', 'sallsynt', { grenades: 2, grenadeDmg: 0.3 }, 2, '+2 MAX GRANATER\n+30 % GRANATSKADA', { unlock: 25 }],
  ['pirathatten', 'KRUTKAPTENENS HATT', 'sallsynt', { dmg: 0.08, knockback: 0.4, killExplode: 0.08 }, 2, '+8 % SKADA\n+40 % KNUFF VID TRÄFF\n8 % CHANS ATT DÖDADE\nFIENDER EXPLODERAR'],
  ['horisonten', 'HORISONTRUNAN', 'sallsynt', { interest: 0.1, floorHeal: 10 }, 1, '10 % RÄNTA PÅ GULDET VID\nVARJE NY VÅNING (MAX 30)\n+10 HP VID VARJE NY VÅNING'],
  ['runsten', 'ÅSKRUNAN', 'sallsynt', { shockChance: 0.2, reloadNova: 20 }, 1, '20 % CHANS ATT EN BLIXT\nHOPPAR TILL EN GRANNE\nOMLADDNING GER EN STÖT\nSOM GÖR 20 SKADA', { unlock: 30 }],
  ['eremiten', 'EREMITENS Ö', 'sallsynt', { floorHeal: 30, regen: 0.5, moveSpeed: -0.1 }, 1, '+30 HP VID VARJE NY VÅNING\n+0,5 HP PER SEKUND\n-10 % RÖRELSEHASTIGHET', { curse: true, bad: 1 }],
  ['snedkronet', 'GIFTKRONAN', 'sallsynt', { poisonChance: 0.25, critChance: 0.05 }, 2, '25 % CHANS ATT FÖRGIFTA\n+5 % KRITCHANS', { unlock: 25 }],
  // legendariska
  ['prismakronan', 'REGNBÅGSKRONAN', 'legendarisk', { burnChance: 0.15, freezeChance: 0.15, poisonChance: 0.15, shockChance: 0.15 }, 1, '15 % BRANDCHANS\n15 % CHANS ATT FRYSA\n15 % CHANS ATT FÖRGIFTA\n15 % BLIXTCHANS', { unlock: 50 }],
  ['gryningen', 'GRYNINGSKORSET', 'legendarisk', { doubleJump: 1, airDmg: 0.35, stamina: 0.25 }, 1, 'DUBBELHOPP\n+35 % SKADA I LUFTEN\n+25 % UTHÅLLIGHET', { unlock: 45 }],
  ['travstaven', 'PILGRIMSSTAVEN', 'legendarisk', { dashCd: 0.3, dashDmg: 30, dodge: 0.08 }, 1, '30 % KORTARE ÅTERHÄMTNING\nFÖR RUSNING\nRUSNING GÖR 30 SKADA\n+8 % CHANS ATT UNDVIKA', { unlock: 40 }],
  ['brokiga', 'ÖDETS VÄV', 'legendarisk', { cardChoices: 1, chestChoice: 1, freeReroll: 1, luck: 0.15 }, 1, '+1 VAL VID KORTDRAGNING\n+1 VAL I KISTOR\n+1 GRATIS NYA KORT PER VÅNING\n+15 % LYCKA', { unlock: 55 }],
  ['ansiktslos', 'DEN ANSIKTSLÖSE', 'legendarisk', { backstab: 1, enemySense: 1, dmg: 0.2, maxHp: -30, healMul: -0.25 }, 1, '+100 % SKADA MOT OVETANDE\nFIENDER SYNS GENOM VÄGGAR\n+20 % SKADA\n-30 MAX HP\n-25 % HELNING', { curse: true, bad: 2, unlock: 40 }],
  // ---- NYA KORT (version 5): drycker, följeslagare och allierade, närstrid, blödning, brand, kyla och huvudträffar ----
  // vanliga
  ['lakebladet', 'LÄKEBLADET', 'vanlig', { potionPower: 0.15 }, 4, '+15 % STARKARE DRYCKER'],
  ['groddrunan', 'GRODDRUNAN', 'vanlig', { potionChance: 0.12 }, 3, '+12 % FLER DRYCKER'],
  ['vargtanden', 'VARGTANDEN', 'vanlig', { petPower: 0.15 }, 4, '+15 % STARKARE\nFÖLJESLAGARE'],
  ['jarnnaven', 'JÄRNNÄVEN', 'vanlig', { meleeDmg: 0.2 }, 4, '+20 % NÄRSTRIDSSKADA'],
  ['eldrunan', 'ELDRUNAN', 'vanlig', { fireDmg: 0.15 }, 4, '+15 % BRANDSKADA'],
  ['frosttoppen', 'FROSTTOPPEN', 'vanlig', { coldResist: 0.2 }, 3, '-20 % SKADA FRÅN\nKÖLD OCH FROST'],
  ['slaktkroken', 'SLAKTKROKEN', 'vanlig', { bleedChance: 0.1 }, 3, '10 % CHANS ATT FIENDEN\nBÖRJAR BLÖDA'],
  ['spejarkikaren', 'SPEJARKIKAREN', 'vanlig', { headshot: 0.2 }, 4, '+20 % SKADA VID HUVUDTRÄFF'],
  ['manrunan', 'MÅNRUNAN', 'vanlig', { lightRadius: 1 }, 3, '+1 LJUSRADIE'],
  ['marknadstaltet', 'MARKNADSTÄLTET', 'vanlig', { npcDiscount: 0.1 }, 3, '-10 % PRISER HOS\nALKEMISTEN OCH PRÄSTEN'],
  ['vapenladorna', 'VAPENLÅDORNA', 'vanlig', { weaponDrop: 0.1 }, 3, '10 % CHANS ATT ELITER\nTAPPAR SITT VAPEN'],
  ['dodsrunan', 'DÖDSRUNAN', 'vanlig', { allyChance: 0.04 }, 3, '4 % CHANS ATT EN DÖDAD\nFIENDE RESER SIG SOM\nDIN ALLIERADE'],
  // ovanliga
  ['blandbradet', 'BLANDBRÄDET', 'ovanlig', { potionPower: 0.12, potionChance: 0.12 }, 2, '+12 % STARKARE DRYCKER\n+12 % FLER DRYCKER', { unlock: 15 }],
  ['flockens_horn', 'FLOCKENS HORN', 'ovanlig', { petPower: 0.2, allyChance: 0.03 }, 2, '+20 % STARKARE\nFÖLJESLAGARE\n3 % CHANS ATT DÖDADE\nFIENDER BLIR ALLIERADE'],
  ['gapet', 'DET GRINANDE GAPET', 'ovanlig', { bleedChance: 0.15, meleeDmg: 0.15 }, 2, '15 % CHANS TILL BLÖDNING\n+15 % NÄRSTRIDSSKADA', { unlock: 15 }],
  ['bodelsnalen', 'BÖDELSNÅLEN', 'ovanlig', { headshot: 0.3, critChance: 0.03 }, 3, '+30 % SKADA VID HUVUDTRÄFF\n+3 % KRITCHANS'],
  ['ristarboden', 'RISTARBODEN', 'ovanlig', { npcDiscount: 0.15, shopDiscount: 0.05 }, 2, '-15 % PRISER HOS\nALKEMISTEN OCH PRÄSTEN\n-5 % PRISER I BUTIKEN'],
  ['brinnande_tornet', 'DET BRINNANDE TORNET', 'ovanlig', { fireDmg: 0.2, burnChance: 0.08 }, 2, '+20 % BRANDSKADA\n8 % BRANDCHANS'],
  ['trogna_anden', 'DEN TROGNA ANDEN', 'ovanlig', { allyChance: 0.05, petPower: 0.1 }, 2, '5 % CHANS ATT DÖDADE\nFIENDER BLIR ALLIERADE\n+10 % STARKARE\nFÖLJESLAGARE', { unlock: 15 }],
  ['overflodet', 'ÖVERFLÖDETS KORG', 'ovanlig', { potionChance: 0.2, ammoMul: 0.1 }, 2, '+20 % FLER DRYCKER\n+10 % AMMO FRÅN FÖREMÅL'],
  ['spokspegeln', 'SPÖKSPEGELN', 'ovanlig', { allyChance: 0.1, damageTaken: 0.15 }, 1, '10 % CHANS ATT DÖDADE\nFIENDER BLIR ALLIERADE\n+15 % SKADA DU TAR', { curse: true, bad: 1, unlock: 20 }],
  // sällsynta
  ['ishavet', 'ISHAVETS VÅG', 'sallsynt', { coldResist: 0.3, armorPerFloor: 8 }, 2, '-30 % SKADA FRÅN\nKÖLD OCH FROST\n+8 RUSTNING VID VARJE VÅNING'],
  ['jagarogat', 'JÄGARÖGAT', 'sallsynt', { headshot: 0.4, critDmg: 0.2 }, 2, '+40 % SKADA VID HUVUDTRÄFF\n+20 % KRITSKADA', { unlock: 25 }],
  ['dimvasen', 'DIMVÄSENDEN', 'sallsynt', { allyChance: 0.08, petPower: 0.2 }, 2, '8 % CHANS ATT DÖDADE\nFIENDER BLIR ALLIERADE\n+20 % STARKARE\nFÖLJESLAGARE', { unlock: 30 }],
  ['gavoasken', 'DEN FÖRSEGLADE GÅVAN', 'sallsynt', { weaponDrop: 0.2, luck: 0.05 }, 1, '20 % CHANS ATT ELITER\nTAPPAR SITT VAPEN\n+5 % LYCKA', { unlock: 25 }],
  ['haxkvasten', 'HÄXKVASTEN', 'sallsynt', { potionPower: 0.2, potionChance: 0.15, moveSpeed: 0.05 }, 2, '+20 % STARKARE DRYCKER\n+15 % FLER DRYCKER\n+5 % RÖRELSEHASTIGHET', { unlock: 25 }],
  ['trallbojan', 'TRÄLBOJAN', 'sallsynt', { allyChance: 0.15, petPower: 0.3, moveSpeed: -0.1 }, 1, '15 % CHANS ATT DÖDADE\nFIENDER BLIR ALLIERADE\n+30 % STARKARE\nFÖLJESLAGARE\n-10 % RÖRELSEHASTIGHET', { curse: true, bad: 1, unlock: 20 }],
  // legendariska
  ['purpurkitteln', 'PURPURKITTELN', 'legendarisk', { potionPower: 0.4, potionChance: 0.3, healMul: 0.15, npcDiscount: 0.15 }, 1, '+40 % STARKARE DRYCKER\n+30 % FLER DRYCKER\n+15 % HELNING\n-15 % PRISER HOS\nALKEMISTEN OCH PRÄSTEN', { unlock: 45 }],
  ['karmosinhjartat', 'KARMOSINHJÄRTAT', 'legendarisk', { bleedChance: 0.3, meleeDmg: 0.25, lifesteal: 0.04, maxHp: 20 }, 1, '30 % CHANS TILL BLÖDNING\n+25 % NÄRSTRIDSSKADA\n4 % AV SKADAN BLIR HP\n+20 MAX HP', { unlock: 50 }],
  ['dodsbesvarjaren', 'DÖDSBESVÄRJARENS SINNE', 'legendarisk', { allyChance: 0.15, petPower: 0.4, killHeal: 1 }, 1, '15 % CHANS ATT DÖDADE\nFIENDER BLIR ALLIERADE\n+40 % STARKARE FÖLJESLAGARE\n+1 HP PER DÖDAD FIENDE', { unlock: 50 }],
  // ---- VAPENPAKTER: låser rundan till ett vapen och öppnar dess unika uppgraderingar ----
  ['pakt_pistol', 'REVOLVERMANNENS ED', 'sallsynt', { dmg: 0.15 }, 1, '+15 % SKADA\nALL AMMO BLIR 9MM\n5 UNIKA UPPGRADERINGAR\nBARA PISTOL RESTEN AV RUNDAN', { pact: 'pistol', bad: 1 }],
  ['pakt_hagel', 'SLAKTARENS ED', 'sallsynt', { dmg: 0.15 }, 1, '+15 % SKADA\nALL AMMO BLIR PATRONER\n5 UNIKA UPPGRADERINGAR\nBARA HAGELGEVÄR RESTEN AV RUNDAN', { pact: 'shotgun', bad: 1 }],
  ['pakt_gevar', 'SKYTTENS ED', 'sallsynt', { dmg: 0.15 }, 1, '+15 % SKADA\nALL AMMO BLIR 5.56\n4 UNIKA UPPGRADERINGAR\nBARA GEVÄR RESTEN AV RUNDAN', { pact: 'rifle', bad: 1 }],
  ['pakt_kpist', 'BLYREGNETS ED', 'sallsynt', { dmg: 0.15 }, 1, '+15 % SKADA\nALL AMMO BLIR 9MM\n4 UNIKA UPPGRADERINGAR\nBARA KPIST RESTEN AV RUNDAN', { pact: 'smg', bad: 1 }],
  // ---- VAPENUPPGRADERINGAR: dyker bara upp när man har vapnets pakt. Ändrar hur vapnet fungerar. ----
  ['studskulan', 'STUDSKULAN', 'ovanlig', {}, 1, 'TRÄFFAR STUDSAR VIDARE\nTILL NÄSTA FIENDE', { weapon: 'pistol', wup: 'ricochet' }],
  ['hanen', 'HANEFLÄKTEN', 'sallsynt', {}, 1, 'HÅLL IN: PISTOLEN TÖMMER\nMAGASINET I ETT SVEP\nSVEPET SPRIDER SIG', { weapon: 'pistol', wup: 'fan', bad: 1 }],
  ['sista_kulan', 'SISTA KULAN', 'ovanlig', {}, 1, 'SISTA SKOTTET I MAGASINET\nGÖR 3× SKADA OCH EXPLODERAR', { weapon: 'pistol', wup: 'lastround' }],
  ['duellanten', 'DUELLANTEN', 'sallsynt', {}, 1, 'OVETANDE FIENDER DÖR AV\nFÖRSTA TRÄFFEN\n3× SKADA PÅ OVETANDE ELIT', { weapon: 'pistol', wup: 'duel' }],
  ['tomhylsan', 'TOMHYLSAN', 'ovanlig', {}, 1, 'TOMT MAGASIN LADDAS OM\nPÅ ETT ÖGONBLICK', { weapon: 'pistol', wup: 'quickload' }],
  ['drakanden', 'DRAKANDEN', 'ovanlig', {}, 1, 'VARJE HAGEL SÄTTER\nFIENDEN I BRAND', { weapon: 'shotgun', wup: 'dragon' }],
  ['dubbelpipan', 'DUBBELPIPAN', 'sallsynt', {}, 1, 'TVÅ PATRONER PER SKOTT:\nDUBBELT SÅ MÅNGA HAGEL\nLÄNGRE MELLAN SKOTTEN', { weapon: 'shotgun', wup: 'double', bad: 1 }],
  ['slagkraften', 'SLAGKRAFTEN', 'ovanlig', {}, 1, 'NÄRA FIENDER SLUNGAS BAKÅT\nKROCK MOT VÄGG GER SKADA', { weapon: 'shotgun', wup: 'knock' }],
  ['splitterhaglet', 'SPLITTERHAGLET', 'sallsynt', {}, 1, 'FIENDER SOM DÖR AV HAGEL\nSPRÄNGS I SPLITTER', { weapon: 'shotgun', wup: 'shrapnel' }],
  ['snigeln', 'SNIGELN', 'legendarisk', {}, 1, 'SIKTA: SKJUTER EN SNIGEL SOM\nGÅR IGENOM ALLA FIENDER\nOCH GÖR 6× SKADA', { weapon: 'shotgun', wup: 'slug' }],
  ['kedjeblixten', 'KEDJEBLIXTEN', 'sallsynt', {}, 1, 'VAR FJÄRDE TRÄFF HOPPAR\nSOM BLIXT TILL 3 FIENDER', { weapon: 'rifle', wup: 'chain' }],
  ['kalla_blodet', 'KALLA BLODET', 'sallsynt', {}, 1, 'SIKTA 1 S: NÄSTA SKOTT GÖR\n4× SKADA OCH GÅR IGENOM', { weapon: 'rifle', wup: 'focus' }],
  ['kastmagasinet', 'KASTMAGASINET', 'ovanlig', {}, 1, 'OMLADDNING KASTAR DET GAMLA\nMAGASINET SOM EN GRANAT', { weapon: 'rifle', wup: 'grenade' }],
  ['skarpskytten', 'SKARPSKYTTEN', 'ovanlig', {}, 1, 'TRÄFFAR PÅ ÖVER 7 RUTOR ÄR\nALLTID KRITISKA, INGEN\nSKADEMINSKNING MED AVSTÅND', { weapon: 'rifle', wup: 'marksman' }],
  ['spinnpipan', 'SPINNPIPAN', 'ovanlig', {}, 1, 'HÅLL IN: ELDHASTIGHETEN\nVÄXER TILL DET DUBBLA', { weapon: 'smg', wup: 'spin' }],
  ['rikoschetten', 'RIKOSCHETTEN', 'ovanlig', {}, 1, 'KULOR STUDSAR MOT VÄGGAR\nOCH KAN TRÄFFA IGEN', { weapon: 'smg', wup: 'ricowall' }],
  ['dodsmarket', 'DÖDSMÄRKET', 'sallsynt', {}, 1, 'VAR ÅTTONDE TRÄFF PÅ SAMMA\nFIENDE DETONERAR MÄRKET', { weapon: 'smg', wup: 'marks' }],
  ['blybaltet', 'BLYBÄLTET', 'legendarisk', {}, 1, 'INGEN OMLADDNING: SKJUTER\nDIREKT UR RESERVEN\nSPRIDNINGEN VÄXER', { weapon: 'smg', wup: 'belt', bad: 1 }],
  // ---- pakter och uppgraderingar för dubbelbössa, armborst, signalpistol och prickskyttegevär ----
  ['pakt_dubbel', 'BÖDELNS ED', 'sallsynt', { dmg: 0.15 }, 1, '+15 % SKADA\nALL AMMO BLIR PATRONER\n4 UNIKA UPPGRADERINGAR\nBARA DUBBELBÖSSA RESTEN AV RUNDAN', { pact: 'dbshotgun', bad: 1 }],
  ['pakt_armborst', 'JÄGARENS ED', 'sallsynt', { dmg: 0.15 }, 1, '+15 % SKADA\nALL AMMO BLIR PILAR\n4 UNIKA UPPGRADERINGAR\nBARA ARMBORST RESTEN AV RUNDAN', { pact: 'crossbow', bad: 1 }],
  ['pakt_signal', 'FACKELBÄRARENS ED', 'sallsynt', { dmg: 0.15 }, 1, '+15 % SKADA\nALL AMMO BLIR BLOSS\n4 UNIKA UPPGRADERINGAR\nBARA SIGNALPISTOL RESTEN AV RUNDAN', { pact: 'flaregun', bad: 1 }],
  ['pakt_prick', 'SKARPRÄTTARENS ED', 'sallsynt', { dmg: 0.15 }, 1, '+15 % SKADA\nALL AMMO BLIR 5.56\n4 UNIKA UPPGRADERINGAR\nBARA PRICKSKYTTEGEVÄR RESTEN AV RUNDAN', { pact: 'sniper', bad: 1 }],
  ['blodskorden', 'BLODSKÖRDEN', 'ovanlig', {}, 1, 'VARJE DÖDAD FIENDE GER\n3 HP OCH EN PATRON TILLBAKA', { weapon: 'dbshotgun', wup: 'harvest' }],
  ['dubbeldoden', 'DUBBELDÖDEN', 'sallsynt', {}, 1, 'DÖDAR ETT SKOTT TVÅ FIENDER\nLADDAS BÅDA PIPORNA DIREKT', { weapon: 'dbshotgun', wup: 'doublekill' }],
  ['kedjekulan', 'KEDJEKULAN', 'sallsynt', {}, 1, 'TRE TUNGA KULOR I STÄLLET\nFÖR HAGEL: 3× SKADA VAR\nOCH GÅR IGENOM ALLA', { weapon: 'dbshotgun', wup: 'chainshot' }],
  ['stormsteget', 'STORMSTEGET', 'ovanlig', {}, 1, 'SKOTTET KASTAR DIG BAKÅT\nOCH DU TAR INGEN SKADA\nUNDER 0,4 S', { weapon: 'dbshotgun', wup: 'stormstep' }],
  ['sprangspetsen', 'SPRÄNGSPETSEN', 'sallsynt', {}, 1, 'PILAR FASTNAR I FIENDEN\nOCH SPRÄNGS EFTER 0,8 S', { weapon: 'crossbow', wup: 'blastbolt' }],
  ['giftspetsen', 'GIFTSPETSEN', 'ovanlig', {}, 1, 'TRÄFFAR FÖRGIFTAR I 4 S\nGIFTET SPRIDS NÄR\nFIENDEN DÖR', { weapon: 'crossbow', wup: 'poison' }],
  ['pilsamlaren', 'PILSAMLAREN', 'ovanlig', {}, 1, 'DÖDANDE PILAR KOMMER\nTILLBAKA OCH LÄGGS I DIREKT', { weapon: 'crossbow', wup: 'recover' }],
  ['treskottet', 'TRESKOTTET', 'legendarisk', {}, 1, 'TRE PILAR I EN SOLFJÄDER\nFÖR PRISET AV EN', { weapon: 'crossbow', wup: 'triple' }],
  ['fyrverkeriet', 'FYRVERKERIET', 'sallsynt', {}, 1, 'BLOSSET SPRICKER I FEM\nGNISTOR SOM OCKSÅ BRINNER', { weapon: 'flaregun', wup: 'cluster' }],
  ['solblosset', 'SOLBLOSSET', 'ovanlig', {}, 1, 'BLOSSET BLÄNDAR FIENDER\nINOM 3 RUTOR I 2 S', { weapon: 'flaregun', wup: 'blind' }],
  ['ekoblosset', 'EKOBLOSSET', 'ovanlig', {}, 1, 'BLOSSET STUDSAR MOT\nVÄGGAR TVÅ GÅNGER', { weapon: 'flaregun', wup: 'bounce' }],
  ['lopelden', 'LÖPELDEN', 'sallsynt', {}, 1, 'BRINNANDE FIENDER SOM DÖR\nTÄNDER ELD PÅ GRANNARNA', { weapon: 'flaregun', wup: 'wildfire' }],
  ['huvudjagaren', 'HUVUDJÄGAREN', 'sallsynt', {}, 1, 'ETT DÖDANDE SKOTT LADDAR\nOM DIREKT OCH NÄSTA\nSKOTT GÖR 2× SKADA', { weapon: 'sniper', wup: 'headhunter' }],
  ['genomborraren', 'GENOMBORRAREN', 'sallsynt', {}, 1, 'KULAN GÅR IGENOM VÄGGAR\nUPP TILL 2 RUTOR TJOCKA', { weapon: 'sniper', wup: 'wallpierce' }],
  ['tidsstoppet', 'TIDSSTOPPET', 'legendarisk', {}, 1, 'NÄR DU SIKTAR GÅR\nTIDEN I HALV FART', { weapon: 'sniper', wup: 'bullettime' }],
  ['sprangkulan', 'SPRÄNGKULAN', 'ovanlig', {}, 1, 'VARJE TRÄFF EXPLODERAR', { weapon: 'sniper', wup: 'explosive' }],
  ['tomhetsstenen', 'TOMHETSSTENEN', 'legendarisk', { dmg: 0.6, fireRate: 0.25, maxHp: -40, damageTaken: 0.35 }, 1, '+60 % SKADA\n+25 % ELDHASTIGHET\n-40 MAX HP\n+35 % SKADA DU TAR', { curse: true, bad: 2, unlock: 40 }],
  // ---- pakter och uppgraderingar för yxan, eldkastaren och granatkastaren (version 5) ----
  ['pakt_yxa', 'BÄRSÄRKENS ED', 'sallsynt', { dmg: 0.15 }, 1, '+15 % SKADA\nYXAN BEHÖVER INGEN AMMO\n4 UNIKA UPPGRADERINGAR\nBARA YXA RESTEN AV RUNDAN', { pact: 'axe', bad: 1 }],
  ['pakt_eld', 'MORDBRÄNNARENS ED', 'sallsynt', { dmg: 0.15 }, 1, '+15 % SKADA\nALL AMMO BLIR BRÄNSLE\n4 UNIKA UPPGRADERINGAR\nBARA ELDKASTARE RESTEN AV RUNDAN', { pact: 'flamer', bad: 1 }],
  ['pakt_gk', 'SPRÄNGMÄSTARENS ED', 'sallsynt', { dmg: 0.15 }, 1, '+15 % SKADA\nALL AMMO BLIR GRANATER\n4 UNIKA UPPGRADERINGAR\nBARA GRANATKASTARE RESTEN AV RUNDAN', { pact: 'launcher', bad: 1 }],
  ['virvelhugget', 'VIRVELHUGGET', 'sallsynt', {}, 1, 'LADDAT SLAG SNURRAR RUNT\nOCH TRÄFFAR ALLA\nOMKRING DIG', { weapon: 'axe', wup: 'axe_whirl' }],
  ['aderlataren', 'ÅDERLÅTAREN', 'ovanlig', {}, 1, 'TRÄFFAR GER BLÖDNING:\nSKADA ÖVER TID', { weapon: 'axe', wup: 'axe_bleed' }],
  ['returkastet', 'RETURKASTET', 'sallsynt', {}, 1, 'DEN KASTADE YXAN STUDSAR\nVIDARE TILL EN ANDRA FIENDE', { weapon: 'axe', wup: 'axe_boomerang' }],
  ['skordehugget', 'SKÖRDEHUGGET', 'ovanlig', {}, 1, 'DÖDANDE SLAG GER 5 HP', { weapon: 'axe', wup: 'axe_butcher' }],
  ['brinnande_jord', 'BRINNANDE JORD', 'sallsynt', {}, 1, 'LÅGAN LÄMNAR BRINNANDE\nMARK EFTER SIG', { weapon: 'flamer', wup: 'fl_napalm' }],
  ['bla_lagan', 'BLÅ LÅGAN', 'legendarisk', {}, 1, 'BLÅ LÅGA: +50 % SKADA\nOCH LÄNGRE RÄCKVIDD', { weapon: 'flamer', wup: 'fl_blue' }],
  ['sparlagan', 'SPARLÅGAN', 'ovanlig', {}, 1, 'HALVA BRÄNSLEÅTGÅNGEN', { weapon: 'flamer', wup: 'fl_frugal' }],
  ['eldmuren', 'ELDMUREN', 'sallsynt', {}, 1, 'HÖGERKLICK SPRUTAR EN\nELDVÄGG FRAMFÖR DIG', { weapon: 'flamer', wup: 'fl_wall' }],
  ['splitterskalet', 'SPLITTERSKALET', 'sallsynt', {}, 1, 'GRANATEN SPLITTRAS\nI TRE SMÅ GRANATER', { weapon: 'launcher', wup: 'gl_cluster' }],
  ['tjarbomben', 'TJÄRBOMBEN', 'ovanlig', {}, 1, 'GRANATEN FASTNAR\nPÅ FIENDER', { weapon: 'launcher', wup: 'gl_sticky' }],
  ['jattegranaten', 'JÄTTEGRANATEN', 'legendarisk', {}, 1, 'DUBBEL SPRÄNGRADIE\nGRANATEN FLYGER LÅNGSAMMARE', { weapon: 'launcher', wup: 'gl_mega', bad: 1 }],
  ['trummagasinet', 'TRUMMAGASINET', 'sallsynt', {}, 1, 'TRE GRANATER I SNABB FÖLJD', { weapon: 'launcher', wup: 'gl_drum' }],
  // ---- NYA KORT: runor, hetta, mana, pilar, uppdrag, lägereld, förmågor, hemligheter och måltider ----
  // vanliga
  ['runristaren', 'RUNRISTAREN', 'vanlig', { runePower: 0.15 }, 4, '+15 % STARKARE RUNOR'],
  ['manastjarnan', 'MANASTJÄRNAN', 'vanlig', { manaRegen: 0.15 }, 4, '+15 % SNABBARE MANA'],
  ['fjaderpennan', 'FJÄDERPENNAN', 'vanlig', { arrowRetrieve: 0.12 }, 3, '12 % CHANS ATT PILEN\nKOMMER TILLBAKA'],
  ['hamstraren', 'HAMSTRAREN', 'vanlig', { questGold: 0.2 }, 3, '+20 % GULD FRÅN UPPDRAG'],
  ['vilostenen', 'VILOSTENEN', 'vanlig', { campfireHeal: 0.25 }, 3, '+25 % BÄTTRE VILA VID\nLÄGERELDEN'],
  ['blixtstenen', 'BLIXTSTENEN', 'vanlig', { activeCd: 0.1 }, 3, '10 % KORTARE NEDRÄKNING\nFÖR FÖRMÅGAN'],
  ['stjarnkartan', 'STJÄRNKARTAN', 'vanlig', { secretChance: 0.1 }, 3, '+10 % CHANS TILL\nHEMLIGA TRAPPOR'],
  ['pilgrimsfrukten', 'PILGRIMSFRUKTEN', 'vanlig', { mealPower: 0.2 }, 4, '+20 % STARKARE MÅLTIDER'],
  ['skattbrevet', 'SKATTJÄGARENS BREV', 'vanlig', { trapResist: 0.15, secretChance: 0.05 }, 3, '-15 % SKADA FRÅN FÄLLOR\n+5 % CHANS TILL\nHEMLIGA TRAPPOR'],
  ['askbrevet', 'ASKBREVET', 'vanlig', { heatResist: 0.2 }, 3, '-20 % SKADA FRÅN\nHETTA OCH ELD'],
  // ovanliga
  ['runskivan', 'RUNSKIVAN', 'ovanlig', { runeSlots: 1 }, 2, '+1 RUNPLATS', { unlock: 15 }],
  ['arkana_karnan', 'DEN ARKANA KÄRNAN', 'ovanlig', { manaRegen: 0.2, shockChance: 0.05 }, 2, '+20 % SNABBARE MANA\n5 % CHANS ATT EN BLIXT\nHOPPAR TILL EN GRANNE', { unlock: 15 }],
  ['jaktmarket', 'JAKTMÄRKET', 'ovanlig', { headshot: 0.25, arrowRetrieve: 0.08 }, 3, '+25 % SKADA VID HUVUDTRÄFF\n8 % CHANS ATT PILEN\nKOMMER TILLBAKA'],
  ['ballongerna', 'GYCKLARENS BALLONGER', 'ovanlig', { questGold: 0.25, luck: 0.05 }, 2, '+25 % GULD FRÅN UPPDRAG\n+5 % LYCKA'],
  ['marketenterskan', 'MARKETENTERSKAN', 'ovanlig', { mealPower: 0.2, campfireHeal: 0.15 }, 2, '+20 % STARKARE MÅLTIDER\n+15 % BÄTTRE VILA VID\nLÄGERELDEN'],
  ['andekortet', 'ANDEKORTET', 'ovanlig', { activeCd: 0.15, dodge: 0.03 }, 2, '15 % KORTARE NEDRÄKNING\nFÖR FÖRMÅGAN\n+3 % CHANS ATT UNDVIKA', { unlock: 15 }],
  ['frostglassen', 'FROSTGLASSEN', 'ovanlig', { mealPower: 0.15, heatResist: 0.15 }, 2, '+15 % STARKARE MÅLTIDER\n-15 % SKADA FRÅN\nHETTA OCH ELD'],
  ['svarta_gavan', 'DEN SVARTA GÅVAN', 'ovanlig', { activeCd: 0.3, maxHp: -20 }, 1, '30 % KORTARE NEDRÄKNING\nFÖR FÖRMÅGAN\n-20 MAX HP', { curse: true, bad: 1, unlock: 20 }],
  // sällsynta
  ['runkistan', 'RUNKISTAN', 'sallsynt', { runeSlots: 1, runePower: 0.15 }, 1, '+1 RUNPLATS\n+15 % STARKARE RUNOR', { unlock: 25 }],
  ['fullmanen', 'FULLMÅNEN', 'sallsynt', { secretChance: 0.2, secretSense: 1 }, 1, '+20 % CHANS TILL\nHEMLIGA TRAPPOR\nHEMLIGA VÄGGAR SYNS\nPÅ KARTAN', { unlock: 25 }],
  ['vulkanvaggen', 'VULKANVÄGGEN', 'sallsynt', { heatResist: 0.3, fireDmg: 0.15, trapResist: 0.1 }, 2, '-30 % SKADA FRÅN\nHETTA OCH ELD\n+15 % BRANDSKADA\n-10 % SKADA FRÅN FÄLLOR'],
  ['pilpungen', 'PILPUNGEN', 'sallsynt', { arrowRetrieve: 0.2, ammoMul: 0.1 }, 2, '20 % CHANS ATT PILEN\nKOMMER TILLBAKA\n+10 % AMMO FRÅN FÖREMÅL', { unlock: 25 }],
  ['demonrunorna', 'DEMONENS RUNOR', 'sallsynt', { runeSlots: 2, runePower: 0.2, damageTaken: 0.2 }, 1, '+2 RUNPLATSER\n+20 % STARKARE RUNOR\n+20 % SKADA DU TAR', { curse: true, bad: 1, unlock: 20 }],
  // legendariska
  ['asktemplet', 'ASKTEMPLET', 'legendarisk', { heatResist: 0.4, fireDmg: 0.3, burnChance: 0.15, trapResist: 0.2 }, 1, '-40 % SKADA FRÅN\nHETTA OCH ELD\n+30 % BRANDSKADA\n15 % BRANDCHANS\n-20 % SKADA FRÅN FÄLLOR', { unlock: 50 }],
  ['stjarnskytten', 'SKYTTENS STJÄRNBILD', 'legendarisk', { arrowRetrieve: 0.3, headshot: 0.4, critChance: 0.06, accuracy: 0.15 }, 1, '30 % CHANS ATT PILEN\nKOMMER TILLBAKA\n+40 % SKADA VID HUVUDTRÄFF\n+6 % KRITCHANS\n+15 % TRÄFFSÄKERHET', { unlock: 50 }],
  // ---- AKTIVA FÖRMÅGOR: ett kort med `active` ger en förmåga med nedräkning (cd, sekunder). Den senast tagna gäller (activeOf). ----
  ['blinken', 'BLINKEN', 'sallsynt', {}, 1, 'TELEPORTERA DIG\nFRAMÅT EN BIT', { active: 'blink', cd: 8 }],
  ['tidsbubblan', 'TIDSBUBBLAN', 'legendarisk', {}, 1, 'ALLT RUNT DIG SAKTAR\nNED I 5 S', { active: 'slowmo', cd: 25, unlock: 40 }],
  ['skoldbubblan', 'SKÖLDBUBBLAN', 'sallsynt', {}, 1, 'EN BUBBLA BLOCKERAR\nPROJEKTILER I 4 S', { active: 'bubble', cd: 20, unlock: 25 }],
  ['valnadskallet', 'VÅLNADSKALLET', 'legendarisk', {}, 1, 'KALLA PÅ TVÅ ALLIERADE\nVÅLNADER', { active: 'summon', cd: 30, unlock: 45 }],
  ['jordskalvet', 'JORDSKALVET', 'sallsynt', {}, 1, 'SLÅ OMKULL ALLA\nFIENDER RUNT DIG', { active: 'quake', cd: 15 }],
  // ---- pakter och uppgraderingar för spikgeväret, blixtstaven och långbågen ----
  ['pakt_spik', 'SPIKSMEDENS ED', 'sallsynt', { dmg: 0.15 }, 1, '+15 % SKADA\nALL AMMO BLIR SPIKAR\n4 UNIKA UPPGRADERINGAR\nBARA SPIKGEVÄR RESTEN AV RUNDAN', { pact: 'nailgun', bad: 1 }],
  ['pakt_stav', 'STORMMAGERNS ED', 'sallsynt', { dmg: 0.15 }, 1, '+15 % SKADA\nALL AMMO BLIR MANA\n4 UNIKA UPPGRADERINGAR\nBARA BLIXTSTAV RESTEN AV RUNDAN', { pact: 'staff', bad: 1 }],
  ['pakt_bage', 'BÅGSKYTTENS ED', 'sallsynt', { dmg: 0.15 }, 1, '+15 % SKADA\nALL AMMO BLIR PILAR\n4 UNIKA UPPGRADERINGAR\nBARA LÅNGBÅGE RESTEN AV RUNDAN', { pact: 'bow', bad: 1 }],
  ['fastspikaren', 'FASTSPIKAREN', 'ovanlig', {}, 1, 'SPIKARNA NÅLAR FAST\nFIENDER LÄNGRE', { weapon: 'nailgun', wup: 'ng_pin' }],
  ['studsspiken', 'STUDSSPIKEN', 'ovanlig', {}, 1, 'SPIKARNA STUDSAR\nVIDARE EN GÅNG', { weapon: 'nailgun', wup: 'ng_ricochet' }],
  ['glodspiken', 'GLÖDSPIKEN', 'sallsynt', {}, 1, 'LÅNG ELDGIVNING FÅR\nSPIKARNA ATT GLÖDA\nOCH TÄNDA FIENDEN', { weapon: 'nailgun', wup: 'ng_heat' }],
  ['rivjarnet', 'RIVJÄRNET', 'sallsynt', {}, 1, 'FIENDER SOM TRÄFFAS\nTAR MER SKADA EN STUND', { weapon: 'nailgun', wup: 'ng_shred' }],
  ['askkedjan', 'ÅSKKEDJAN', 'sallsynt', {}, 1, 'BLIXTEN HOPPAR TILL\nTVÅ FLER FIENDER', { weapon: 'staff', wup: 'st_chain' }],
  ['klotblixten', 'KLOTBLIXTEN', 'ovanlig', {}, 1, 'LADDAT KLOT BLIR\nSTÖRRE OCH STUDSAR', { weapon: 'staff', wup: 'st_orb' }],
  ['manakallan', 'MANAKÄLLAN', 'ovanlig', {}, 1, 'MANAN LADDAS DUBBELT\nSÅ SNABBT', { weapon: 'staff', wup: 'st_mana' }],
  ['dunderslaget', 'DUNDERSLAGET', 'legendarisk', {}, 1, 'BLIXTEN BEDÖVAR\nFIENDERNA DEN TRÄFFAR', { weapon: 'staff', wup: 'st_stun' }],
  ['spjutpilen', 'SPJUTPILEN', 'sallsynt', {}, 1, 'PILEN GÅR IGENOM\nALLA FIENDER', { weapon: 'bow', wup: 'bw_pierce' }],
  ['solfjadern', 'SOLFJÄDERN', 'legendarisk', {}, 1, 'TRE PILAR I EN SOLFJÄDER', { weapon: 'bow', wup: 'bw_triple' }],
  ['krutpilen', 'KRUTPILEN', 'sallsynt', {}, 1, 'PILARNA EXPLODERAR\nVID TRÄFF', { weapon: 'bow', wup: 'bw_explosive' }],
  ['atervandaren', 'ÅTERVÄNDAREN', 'ovanlig', {}, 1, 'PILAR SOM TRÄFFAR\nKOMMER TILLBAKA DIREKT', { weapon: 'bow', wup: 'bw_retrieve' }],
  // ---- version 7: pakter och uppgraderingar för kastknivarna, stridshammaren och musköten ----
  ['pakt_kniv', 'LÖNNMÖRDARENS ED', 'sallsynt', { dmg: 0.15 }, 1, '+15 % SKADA\nALL AMMO BLIR KNIVAR\n4 UNIKA UPPGRADERINGAR\nBARA KASTKNIVAR RESTEN AV RUNDAN', { pact: 'knives', bad: 1 }],
  ['pakt_hammare', 'BERGAKUNGENS ED', 'sallsynt', { dmg: 0.15 }, 1, '+15 % SKADA\nHAMMAREN BEHÖVER INGEN AMMO\n4 UNIKA UPPGRADERINGAR\nBARA STRIDSHAMMARE RESTEN AV RUNDAN', { pact: 'hammer', bad: 1 }],
  ['pakt_musköt', 'MUSKETÖRENS ED', 'sallsynt', { dmg: 0.15 }, 1, '+15 % SKADA\nALL AMMO BLIR KULOR\n4 UNIKA UPPGRADERINGAR\nBARA MUSKÖT RESTEN AV RUNDAN', { pact: 'musket', bad: 1, icon: 'assets/cards/pakt_muskot.png' }],
  ['knivsolfjadern', 'KNIVSOLFJÄDERN', 'legendarisk', {}, 1, 'TRE KNIVAR I EN SOLFJÄDER', { weapon: 'knives', wup: 'kn_fan' }],
  ['giftleggen', 'GIFTEGGEN', 'ovanlig', {}, 1, 'KNIVARNA FÖRGIFTAR\nFIENDEN', { weapon: 'knives', wup: 'kn_poison' }],
  ['aterkastet', 'ÅTERKASTET', 'ovanlig', {}, 1, 'KNIVAR SOM MISSAR\nKOMMER TILLBAKA', { weapon: 'knives', wup: 'kn_return' }],
  ['rygghugget', 'RYGGHUGGET', 'sallsynt', {}, 1, 'KNIVAR BAKIFRÅN ÄR\nALLTID KRITISKA', { weapon: 'knives', wup: 'kn_crit' }],
  ['jordbavaren', 'JORDBÄVAREN', 'sallsynt', {}, 1, 'LADDAT SLAG GER ETT\nSTÖRRE JORDSKALV', { weapon: 'hammer', wup: 'hm_quake' }],
  ['dunslaget', 'DÅNSLAGET', 'ovanlig', {}, 1, 'SLAGEN BEDÖVAR\nFIENDEN LÄNGRE', { weapon: 'hammer', wup: 'hm_stun' }],
  ['krossaren', 'KROSSAREN', 'sallsynt', {}, 1, 'FRUSNA FIENDER OCH\nSTENFIENDER SPLITTRAS\nDIREKT', { weapon: 'hammer', wup: 'hm_shatter' }],
  ['hammarkastet', 'HAMMARKASTET', 'legendarisk', {}, 1, 'HÖGERKLICK KASTAR\nHAMMAREN SOM EN BUMERANG', { weapon: 'hammer', wup: 'hm_throw' }],
  ['hagelladdningen', 'HAGELLADDNINGEN', 'legendarisk', {}, 1, 'HAGELLADDNING:\nFEM KULOR PER SKOTT', { weapon: 'musket', wup: 'mk_buck' }],
  ['kruthornet', 'KRUTHORNET', 'ovanlig', {}, 1, 'SNABBARE OMLADDNING', { weapon: 'musket', wup: 'mk_fast' }],
  ['krutroken', 'KRUTRÖKEN', 'ovanlig', {}, 1, 'RÖKEN FÖRVIRRAR\nFIENDERNA', { weapon: 'musket', wup: 'mk_smoke' }],
  ['bajonetten', 'BAJONETTEN', 'sallsynt', {}, 1, 'HÖGERKLICK:\nEN BAJONETTSTÖT', { weapon: 'musket', wup: 'mk_bayonet' }],
  // ---- version 7: smyg, mörker, lampan, spel, banken, vapenvana, krönikesidor och gravskatter ----
  // vanliga
  ['smygskorna', 'SMYGSKORNA', 'vanlig', { noiseReduce: 0.2 }, 3, '20 % MINDRE LJUD'],
  ['tystlaten', 'TYSTLÅTEN', 'vanlig', { detectSlow: 0.15 }, 3, '15 % LÅNGSAMMARE\nUPPTÄCKT'],
  ['lyktbararen', 'LYKTBÄRAREN', 'vanlig', { lampBattery: 0.25 }, 4, '+25 % BATTERITID\nFÖR LAMPAN'],
  ['lyckostjarnan', 'LYCKOSTJÄRNAN', 'vanlig', { gambleLuck: 0.1 }, 3, '+10 % BÄTTRE ODDS\nHOS SPELAREN'],
  ['guldfrot', 'GULDFRÖET', 'vanlig', { bankInterest: 0.1 }, 3, '+10 % RÄNTA PÅ BANKEN'],
  ['ovningssvardet', 'ÖVNINGSSVÄRDET', 'vanlig', { masteryXp: 0.15 }, 4, '+15 % SNABBARE VAPENVANA'],
  ['sjalastenen', 'SJÄLASTENEN', 'vanlig', { pageSouls: 1 }, 3, '+1 SJÄL PER KRÖNIKESIDA'],
  ['guldsallet', 'GULDSÅLLET', 'vanlig', { goldFind: 0.15 }, 3, '+15 % GULD FRÅN HÖGAR\nOCH SARKOFAGER'],
  // ovanliga
  ['kastdolkarna', 'KASTDOLKARNA', 'ovanlig', { stealthDmg: 0.3, critChance: 0.04 }, 2, '+30 % SMYGSKADA\n+4 % KRITCHANS'],
  ['lyktsmeden', 'LYKTSMEDEN', 'ovanlig', { lampRadius: 1, lampBattery: 0.15 }, 2, '+1 LJUSRADIE FÖR LAMPAN\n+15 % BATTERITID', { unlock: 15 }],
  ['bankirens_sigill', 'BANKIRENS SIGILL', 'ovanlig', { bankInterest: 0.15, goldMul: 0.05 }, 2, '+15 % RÄNTA PÅ BANKEN\n+5 % GULD'],
  ['gyllene_skarabeen', 'DEN GYLLENE SKARABÉN', 'ovanlig', { goldFind: 0.2, luck: 0.05 }, 2, '+20 % GULD FRÅN HÖGAR\nOCH SARKOFAGER\n+5 % LYCKA'],
  ['vapenboken', 'VAPENMÄSTARENS BOK', 'ovanlig', { masteryXp: 0.25, dmg: 0.05 }, 2, '+25 % SNABBARE VAPENVANA\n+5 % SKADA', { unlock: 15 }],
  ['nattblinda_ogat', 'DET NATTBLINDA ÖGAT', 'ovanlig', { stealthDmg: 0.5, lampRadius: -1 }, 1, '+50 % SMYGSKADA\n-1 LJUSRADIE FÖR LAMPAN', { curse: true, bad: 1, unlock: 20 }],
  // sällsynta
  ['gravplundraren', 'GRAVPLUNDRAREN', 'sallsynt', { goldFind: 0.3, pageSouls: 1, trapResist: 0.1 }, 1, '+30 % GULD FRÅN HÖGAR\nOCH SARKOFAGER\n+1 SJÄL PER KRÖNIKESIDA\n-10 % SKADA FRÅN FÄLLOR', { unlock: 25 }],
  ['skuggkappan', 'SKUGGKAPPAN', 'sallsynt', { noiseReduce: 0.3, detectSlow: 0.25, dodge: 0.03 }, 1, '30 % MINDRE LJUD\n25 % LÅNGSAMMARE UPPTÄCKT\n+3 % CHANS ATT UNDVIKA', { unlock: 25 }],
  ['blodiga_kronikan', 'DEN BLODIGA KRÖNIKAN', 'sallsynt', { pageSouls: 2, masteryXp: 0.2 }, 1, '+2 SJÄLAR PER KRÖNIKESIDA\n+20 % SNABBARE VAPENVANA'],
  ['skuldbrevet', 'SKULDBREVET', 'sallsynt', { bankInterest: 0.3, gambleLuck: 0.2, maxHp: -20 }, 1, '+30 % RÄNTA PÅ BANKEN\n+20 % BÄTTRE ODDS\nHOS SPELAREN\n-20 MAX HP', { curse: true, bad: 1 }],
  // legendariska
  ['faraonens_mask', 'FARAONENS MASK', 'legendarisk', { goldFind: 0.4, goldMul: 0.15, bankInterest: 0.15, pageSouls: 1 }, 1, '+40 % GULD FRÅN HÖGAR\nOCH SARKOFAGER\n+15 % GULD\n+15 % RÄNTA PÅ BANKEN\n+1 SJÄL PER KRÖNIKESIDA', { unlock: 50 }],
  ['morkrets_furste', 'MÖRKRETS FURSTE', 'legendarisk', { stealthDmg: 0.6, noiseReduce: 0.3, detectSlow: 0.3, lampRadius: 1 }, 1, '+60 % SMYGSKADA\n30 % MINDRE LJUD\n30 % LÅNGSAMMARE UPPTÄCKT\n+1 LJUSRADIE FÖR LAMPAN', { unlock: 50 }],
  // ---- version 8: pakter och uppgraderingar för harpunen, bumerangen och prismat ----
  ['pakt_harpun', 'VALFÅNGARENS ED', 'sallsynt', { dmg: 0.15 }, 1, '+15 % SKADA\nALL AMMO BLIR HARPUNER\n4 UNIKA UPPGRADERINGAR\nBARA HARPUN RESTEN AV RUNDAN', { pact: 'harpoon', bad: 1 }],
  ['pakt_bumerang', 'STÄPPJÄGARENS ED', 'sallsynt', { dmg: 0.15 }, 1, '+15 % SKADA\nBUMERANGEN BEHÖVER INGEN AMMO\n4 UNIKA UPPGRADERINGAR\nBARA BUMERANG RESTEN AV RUNDAN', { pact: 'boomerang', bad: 1 }],
  ['pakt_prisma', 'LJUSBRYTARENS ED', 'sallsynt', { dmg: 0.15 }, 1, '+15 % SKADA\nALL AMMO BLIR LJUSKRISTALLER\n4 UNIKA UPPGRADERINGAR\nBARA PRISMA RESTEN AV RUNDAN', { pact: 'prism', bad: 1 }],
  ['ankarlinan', 'ANKARLINAN', 'sallsynt', {}, 1, 'HARPUNEN DRAR FIENDEN\nÄNDA FRAM TILL DIG', { weapon: 'harpoon', wup: 'hp_pull' }],
  ['hullingen', 'HULLINGEN', 'ovanlig', {}, 1, 'HARPUNEN GER\nBLÖDNING', { weapon: 'harpoon', wup: 'hp_barb' }],
  ['kedjeharpunen', 'KEDJEHARPUNEN', 'legendarisk', {}, 1, 'HARPUNEN FORTSÄTTER\nTILL NÄSTA FIENDE', { weapon: 'harpoon', wup: 'hp_chain' }],
  ['snabbvinschen', 'SNABBVINSCHEN', 'ovanlig', {}, 1, 'SNABBARE OMLADDNING', { weapon: 'harpoon', wup: 'hp_reel' }],
  ['tvillingkastet', 'TVILLINGKASTET', 'legendarisk', {}, 1, 'TVÅ BUMERANGER\nI VARJE KAST', { weapon: 'boomerang', wup: 'bm_twin' }],
  ['eggbumerangen', 'EGGBUMERANGEN', 'sallsynt', {}, 1, 'BUMERANGEN GÅR IGENOM\nALLA FIENDER', { weapon: 'boomerang', wup: 'bm_blade' }],
  ['sokarkastet', 'SÖKARKASTET', 'ovanlig', {}, 1, 'BUMERANGEN SVÄNGER\nMOT FIENDER', { weapon: 'boomerang', wup: 'bm_curve' }],
  ['fangsten', 'FÅNGSTEN', 'sallsynt', {}, 1, 'FÅNGA BUMERANGEN:\nNÄSTA KAST GÖR\nMER SKADA', { weapon: 'boomerang', wup: 'bm_return' }],
  ['trestralen', 'TRESTRÅLEN', 'legendarisk', {}, 1, 'STRÅLEN DELAS I TRE', { weapon: 'prism', wup: 'pr_split' }],
  ['spegelstralen', 'SPEGELSTRÅLEN', 'ovanlig', {}, 1, 'STRÅLEN STUDSAR\nFLER GÅNGER', { weapon: 'prism', wup: 'pr_bounce' }],
  ['fokuslinsen', 'FOKUSLINSEN', 'sallsynt', {}, 1, 'HÅLL INNE FÖR EN\nFOKUSERAD STRÅLE', { weapon: 'prism', wup: 'pr_focus' }],
  ['solstralen', 'SOLSTRÅLEN', 'ovanlig', {}, 1, 'STRÅLEN TÄNDER\nELD PÅ FIENDEN', { weapon: 'prism', wup: 'pr_burn' }],
  // ---- version 8: kristall, hav, kunskap och avgrund ----
  // vanliga
  ['simfenan', 'SIMFENAN', 'vanlig', { swimSpeed: 0.15 }, 4, '+15 % SIMHASTIGHET'],
  ['parlbandet', 'PÄRLBANDET', 'vanlig', { airMax: 3 }, 3, '+3 S LUFT UNDER VATTNET'],
  ['lardomens_ljus', 'LÄRDOMENS LJUS', 'vanlig', { xpMul: 0.15 }, 4, '+15 % ERFARENHET'],
  ['roda_skarvan', 'RÖDA SKÄRVAN', 'vanlig', { crystalDmg: 0.2 }, 3, '+20 % SKADA MOT KRISTALLER'],
  ['tidvattenstenen', 'TIDVATTENSTENEN', 'vanlig', { waterDmg: 0.15 }, 3, '+15 % SKADA NÄR DU\nSTÅR I VATTEN'],
  ['skarvlinsen', 'SKÄRVLINSEN', 'vanlig', { refract: 1 }, 3, '+1 DELNING FRÅN\nBRYTANDE KRISTALLER'],
  ['farjkarlens_obol', 'FÄRJKARLENS OBOL', 'vanlig', { abyssSouls: 0.15 }, 3, '+15 % SJÄLAR I AVGRUNDEN'],
  ['ronnbarskransen', 'RÖNNBÄRSKRANSEN', 'vanlig', { witchResist: 0.2 }, 3, '20 % KORTARE\nFÖRBANNELSER'],
  ['larlingens_dryck', 'LÄRLINGENS DRYCK', 'vanlig', { levelHeal: 10 }, 3, '+10 HP VID NY NIVÅ'],
  ['sjoormen', 'SJÖORMEN', 'vanlig', { swimSpeed: 0.1, airMax: 2 }, 3, '+10 % SIMHASTIGHET\n+2 S LUFT UNDER VATTNET', { unlock: 10 }],
  // ovanliga
  ['visdomsstjarnan', 'VISDOMSSTJÄRNAN', 'ovanlig', { xpMul: 0.2, talentChoice: 1 }, 1, '+20 % ERFARENHET\n+1 TALANGVAL', { unlock: 20 }],
  ['dykarklockan', 'DYKARKLOCKAN', 'ovanlig', { airMax: 4, swimSpeed: 0.1 }, 2, '+4 S LUFT UNDER VATTNET\n+10 % SIMHASTIGHET'],
  ['kristallbrytaren', 'KRISTALLBRYTAREN', 'ovanlig', { crystalDmg: 0.3, refract: 1 }, 2, '+30 % SKADA MOT KRISTALLER\n+1 DELNING FRÅN\nBRYTANDE KRISTALLER', { unlock: 15 }],
  ['krakens_vrede', 'KRAKENS VREDE', 'ovanlig', { waterDmg: 0.25, swimSpeed: 0.1 }, 2, '+25 % SKADA NÄR DU\nSTÅR I VATTEN\n+10 % SIMHASTIGHET'],
  ['avgrundsfyren', 'AVGRUNDSFYREN', 'ovanlig', { abyssSouls: 0.2, levelHeal: 5 }, 2, '+20 % SJÄLAR I AVGRUNDEN\n+5 HP VID NY NIVÅ', { unlock: 20 }],
  ['ronnskolden', 'RÖNNSKÖLDEN', 'ovanlig', { witchResist: 0.3, dodge: 0.03 }, 2, '30 % KORTARE\nFÖRBANNELSER\n+3 % CHANS ATT UNDVIKA'],
  ['drunknarens_sang', 'DRUNKNARENS SÅNG', 'ovanlig', { waterDmg: 0.4, airMax: -4 }, 1, '+40 % SKADA NÄR DU\nSTÅR I VATTEN\n-4 S LUFT UNDER VATTNET', { curse: true, bad: 1 }],
  // sällsynta
  ['regnbagsslipan', 'REGNBÅGSSLIPAN', 'sallsynt', { refract: 2, crystalDmg: 0.25 }, 1, '+2 DELNINGAR FRÅN\nBRYTANDE KRISTALLER\n+25 % SKADA MOT KRISTALLER', { unlock: 30 }],
  ['leviatans_fjall', 'LEVIATANS FJÄLL', 'sallsynt', { swimSpeed: 0.25, airMax: 5, waterDmg: 0.15 }, 1, '+25 % SIMHASTIGHET\n+5 S LUFT UNDER VATTNET\n+15 % SKADA NÄR DU\nSTÅR I VATTEN', { unlock: 30 }],
  ['siarens_oga', 'SIARENS ÖGA', 'sallsynt', { xpMul: 0.3, talentChoice: 1, levelHeal: 5 }, 1, '+30 % ERFARENHET\n+1 TALANGVAL\n+5 HP VID NY NIVÅ'],
  ['haxjagaren', 'HÄXJÄGAREN', 'sallsynt', { witchResist: 0.4, abyssSouls: 0.2 }, 1, '40 % KORTARE\nFÖRBANNELSER\n+20 % SJÄLAR I AVGRUNDEN'],
  ['avgrundens_lofte', 'AVGRUNDENS LÖFTE', 'sallsynt', { abyssSouls: 0.5, xpMul: 0.2, maxHp: -25 }, 1, '+50 % SJÄLAR I AVGRUNDEN\n+20 % ERFARENHET\n-25 MAX HP', { curse: true, bad: 1 }],
  // legendariska
  ['glashjartat', 'GLASHJÄRTAT', 'legendarisk', { crystalDmg: 0.5, refract: 2, witchResist: 0.2 }, 1, '+50 % SKADA MOT KRISTALLER\n+2 DELNINGAR FRÅN\nBRYTANDE KRISTALLER\n20 % KORTARE FÖRBANNELSER', { unlock: 50 }],
  ['avgrundens_arkivarie', 'AVGRUNDENS ARKIVARIE', 'legendarisk', { xpMul: 0.3, talentChoice: 1, abyssSouls: 0.3, levelHeal: 10 }, 1, '+30 % ERFARENHET\n+1 TALANGVAL\n+30 % SJÄLAR I AVGRUNDEN\n+10 HP VID NY NIVÅ', { unlock: 50 }],
  // ---- version 9: pakter och uppgraderingar för sågbladskastaren, vindbössan och spjutet ----
  ['pakt_sagblad', 'SÅGSMEDENS ED', 'sallsynt', { dmg: 0.15 }, 1, '+15 % SKADA\nALL AMMO BLIR KUGGHJUL\n4 UNIKA UPPGRADERINGAR\nBARA SÅGBLAD RESTEN AV RUNDAN', { pact: 'sawlauncher', bad: 1 }],
  ['pakt_vindbossa', 'VINDMAKARENS ED', 'sallsynt', { dmg: 0.15 }, 1, '+15 % SKADA\nINGEN AMMO: LADDAS AV SIG SJÄLV\n4 UNIKA UPPGRADERINGAR\nBARA VINDBÖSSA RESTEN AV RUNDAN', { pact: 'windgun', bad: 1 }],
  ['pakt_spjut', 'SPJUTBÄRARENS ED', 'sallsynt', { dmg: 0.15 }, 1, '+15 % SKADA\nSPJUTET BEHÖVER INGEN AMMO\n4 UNIKA UPPGRADERINGAR\nBARA SPJUT RESTEN AV RUNDAN', { pact: 'spear', bad: 1 }],
  ['trebladet', 'TREBLADET', 'legendarisk', {}, 1, 'TRE KLINGOR\nI VARJE SKOTT', { weapon: 'sawlauncher', wup: 'sw_multi' }],
  ['studsklingan', 'STUDSKLINGAN', 'ovanlig', {}, 1, 'KLINGORNA STUDSAR\nFLER GÅNGER', { weapon: 'sawlauncher', wup: 'sw_bounce' }],
  ['blodklingan', 'BLODKLINGAN', 'ovanlig', {}, 1, 'KLINGORNA GER\nBLÖDNING', { weapon: 'sawlauncher', wup: 'sw_bleed' }],
  ['aterklingan', 'ÅTERKLINGAN', 'sallsynt', {}, 1, 'KLINGORNA KOMMER\nTILLBAKA TILL DIG', { weapon: 'sawlauncher', wup: 'sw_return' }],
  ['virvelvinden', 'VIRVELVINDEN', 'legendarisk', {}, 1, 'STÖTEN LÄMNAR EN VIRVEL\nSOM DRAR IHOP FIENDER', { weapon: 'windgun', wup: 'wg_cyclone' }],
  ['murslaget', 'MURSLAGET', 'sallsynt', {}, 1, 'KNUFF IN I EN VÄGG\nGER DUBBEL SKADA', { weapon: 'windgun', wup: 'wg_slam' }],
  ['nordanvinden', 'NORDANVINDEN', 'ovanlig', {}, 1, 'STÖTEN FRYSER\nFIENDERNA', { weapon: 'windgun', wup: 'wg_cold' }],
  ['stormfronten', 'STORMFRONTEN', 'ovanlig', {}, 1, 'BREDARE STÖT', { weapon: 'windgun', wup: 'wg_wide' }],
  ['genomkastet', 'GENOMKASTET', 'ovanlig', {}, 1, 'KASTET GÅR IGENOM\nFIENDERNA', { weapon: 'spear', wup: 'sp_pierce' }],
  ['aterkallelsen', 'ÅTERKALLELSEN', 'sallsynt', {}, 1, 'SPJUTET FLYGER\nTILLBAKA TILL HANDEN', { weapon: 'spear', wup: 'sp_recall' }],
  ['utfallet', 'UTFALLET', 'ovanlig', {}, 1, 'STÖTEN GÖR ETT\nUTFALL FRAMÅT', { weapon: 'spear', wup: 'sp_lunge' }],
  ['askspjutet', 'ÅSKSPJUTET', 'legendarisk', {}, 1, 'EN BLIXT SLÅR NED\nDÄR SPJUTET LANDAR', { weapon: 'spear', wup: 'sp_storm' }],
  // ---- version 9: urverk, tid, vind, storm och höjd (Klocktornet och Molnborgen) ----
  // vanliga
  ['kuggfickan', 'KUGGFICKAN', 'vanlig', { gearFind: 0.2 }, 3, '+20 % FLER KUGGHJUL'],
  ['sandglaset', 'SANDGLASET', 'vanlig', { timeResist: 0.2 }, 3, 'TIDSBUBBLOR SAKTAR IN\nDIG 20 % MINDRE'],
  ['vindflojeln', 'VINDFLÖJELN', 'vanlig', { windResist: 0.2 }, 3, '20 % MINDRE KNUFF\nFRÅN VIND'],
  ['fjaderfallet', 'FJÄDERFALLET', 'vanlig', { fallSafe: 0.25 }, 3, '25 % MINDRE FALLSKADA'],
  ['askledaren', 'ÅSKLEDAREN', 'vanlig', { lightningResist: 0.2 }, 3, '-20 % SKADA FRÅN BLIXTAR'],
  ['vaggsmallen', 'VÄGGSMÄLLEN', 'vanlig', { pushDmg: 0.25 }, 3, '+25 % SKADA NÄR FIENDER\nKNUFFAS IN I VÄGGAR'],
  ['stoppuret', 'STOPPURET', 'vanlig', { clockSlow: 0.06 }, 3, '+6 % CHANS ATT SAKTA\nIN TRÄFFADE FIENDER'],
  ['molnmyntet', 'MOLNMYNTET', 'vanlig', { skyGold: 0.2 }, 3, '+20 % GULD I MOLNBORGEN'],
  ['urnyckeln', 'URNYCKELN', 'vanlig', { rewindHeal: 4 }, 3, '+4 HP NÄR DU DÖDAR\nEN URVERKSSOLDAT'],
  ['klattrarrepet', 'KLÄTTRARREPET', 'vanlig', { fallSafe: 0.15, windResist: 0.1 }, 3, '15 % MINDRE FALLSKADA\n10 % MINDRE KNUFF\nFRÅN VIND', { unlock: 10 }],
  // ovanliga
  ['massingsringen', 'MÄSSINGSRINGEN', 'ovanlig', { gearFind: 0.25, clockSlow: 0.05 }, 2, '+25 % FLER KUGGHJUL\n+5 % CHANS ATT SAKTA\nIN TRÄFFADE FIENDER', { unlock: 15 }],
  ['pendelvikten', 'PENDELVIKTEN', 'ovanlig', { timeResist: 0.3, rewindHeal: 3 }, 2, 'TIDSBUBBLOR SAKTAR IN\nDIG 30 % MINDRE\n+3 HP PER URVERKSSOLDAT'],
  ['stormhuvan', 'STORMHUVAN', 'ovanlig', { lightningResist: 0.3, windResist: 0.15 }, 2, '-30 % SKADA FRÅN BLIXTAR\n15 % MINDRE KNUFF\nFRÅN VIND'],
  ['tryckvagen', 'TRYCKVÅGEN', 'ovanlig', { pushDmg: 0.3, knockback: 0.2 }, 2, '+30 % SKADA NÄR FIENDER\nKNUFFAS IN I VÄGGAR\n+20 % KNUFF'],
  ['svalvingarna', 'SVALVINGARNA', 'ovanlig', { doubleJump: 1, fallSafe: 0.2 }, 1, 'DUBBELHOPP\n20 % MINDRE FALLSKADA', { unlock: 20 }],
  ['guldmolnet', 'GULDMOLNET', 'ovanlig', { skyGold: 0.25, goldMul: 0.1 }, 2, '+25 % GULD I MOLNBORGEN\n+10 % GULD', { unlock: 15 }],
  ['trasiga_klockan', 'DEN TRASIGA KLOCKAN', 'ovanlig', { clockSlow: 0.12, gearFind: 0.2, timeResist: -0.3 }, 1, '+12 % CHANS ATT SAKTA\nIN TRÄFFADE FIENDER\n+20 % FLER KUGGHJUL\nTIDSBUBBLOR 30 % STARKARE', { curse: true, bad: 1 }],
  // sällsynta
  ['askfangaren', 'ÅSKFÅNGAREN', 'sallsynt', { lightningResist: 0.4, shockChance: 0.1 }, 1, '-40 % SKADA FRÅN BLIXTAR\n+10 % BLIXTCHANS', { unlock: 30 }],
  ['tidsvaktarens_sigill', 'TIDSVÄKTARENS SIGILL', 'sallsynt', { timeResist: 0.4, clockSlow: 0.08, activeCd: 0.1 }, 1, 'TIDSBUBBLOR SAKTAR IN\nDIG 40 % MINDRE\n+8 % CHANS ATT SAKTA\nIN TRÄFFADE FIENDER\n10 % KORTARE NEDRÄKNING', { unlock: 25 }],
  ['virvelstenen', 'VIRVELSTENEN', 'sallsynt', { pushDmg: 0.4, windResist: 0.25 }, 1, '+40 % SKADA NÄR FIENDER\nKNUFFAS IN I VÄGGAR\n25 % MINDRE KNUFF\nFRÅN VIND'],
  ['himlastegen', 'HIMLASTEGEN', 'sallsynt', { skyGold: 0.3, fallSafe: 0.3, doubleJump: 1 }, 1, '+30 % GULD I MOLNBORGEN\n30 % MINDRE FALLSKADA\nDUBBELHOPP', { unlock: 30 }],
  ['stormens_skuld', 'STORMENS SKULD', 'sallsynt', { skyGold: 0.5, rewindHeal: 3, lightningResist: -0.3 }, 1, '+50 % GULD I MOLNBORGEN\n+3 HP PER URVERKSSOLDAT\nBLIXTAR GÖR 30 % MER SKADA', { curse: true, bad: 1 }],
  // legendariska
  ['urmakarens_hjarta', 'URMAKARENS HJÄRTA', 'legendarisk', { gearFind: 0.3, clockSlow: 0.12, rewindHeal: 6, timeResist: 0.3 }, 1, '+30 % FLER KUGGHJUL\n+12 % CHANS ATT SAKTA\nIN TRÄFFADE FIENDER\n+6 HP PER URVERKSSOLDAT\nTIDSBUBBLOR 30 % SVAGARE', { unlock: 50 }],
  ['stormfagelns_fjader', 'STORMFÅGELNS FJÄDER', 'legendarisk', { windResist: 0.4, lightningResist: 0.4, pushDmg: 0.3, skyGold: 0.2 }, 1, '40 % MINDRE KNUFF FRÅN VIND\n-40 % SKADA FRÅN BLIXTAR\n+30 % SKADA NÄR FIENDER\nKNUFFAS IN I VÄGGAR\n+20 % GULD I MOLNBORGEN', { unlock: 50 }],
  // ---- version 11: pakter och uppgraderingar för sporkastaren, spegelskölden och piskan ----
  ['pakt_sporkastare', 'SVAMPODLARENS ED', 'sallsynt', { dmg: 0.15 }, 1, '+15 % SKADA\nALL AMMO BLIR SPORER\n4 UNIKA UPPGRADERINGAR\nBARA SPORKASTARE RESTEN AV RUNDAN', { pact: 'sporelauncher', bad: 1 }],
  ['pakt_spegelskold', 'SPEGELVÄKTARENS ED', 'sallsynt', { dmg: 0.15 }, 1, '+15 % SKADA\nSKÖLDEN BEHÖVER INGEN AMMO\n4 UNIKA UPPGRADERINGAR\nBARA SPEGELSKÖLD RESTEN AV RUNDAN', { pact: 'mirrorshield', bad: 1 }],
  ['pakt_piska', 'TÄMJARENS ED', 'sallsynt', { dmg: 0.15 }, 1, '+15 % SKADA\nPISKAN BEHÖVER INGEN AMMO\n4 UNIKA UPPGRADERINGAR\nBARA PISKA RESTEN AV RUNDAN', { pact: 'whip', bad: 1 }],
  ['sporstormen', 'SPORSTORMEN', 'sallsynt', {}, 1, 'STÖRRE SPORMOLN', { weapon: 'sporelauncher', wup: 'sl_cloud' }],
  ['lakesporerna', 'LÄKESPORERNA', 'ovanlig', {}, 1, 'DINA SPORMOLN\nLÄKER DIG', { weapon: 'sporelauncher', wup: 'sl_heal' }],
  ['smittobararen', 'SMITTOBÄRAREN', 'legendarisk', {}, 1, 'MOLNET SMITTAR VIDARE\nNÄR EN FIENDE DÖR', { weapon: 'sporelauncher', wup: 'sl_chain' }],
  ['snabbsadden', 'SNABBSÅDDEN', 'ovanlig', {}, 1, 'SNABBARE OMLADDNING', { weapon: 'sporelauncher', wup: 'sl_fast' }],
  ['speglingen', 'SPEGLINGEN', 'legendarisk', {}, 1, 'STUDSADE SKOTT GÖR\nDUBBEL SKADA', { weapon: 'mirrorshield', wup: 'ms_reflect' }],
  ['skoldslaget', 'SKÖLDSLAGET', 'ovanlig', {}, 1, 'SLAGET KNUFFAR OCH\nBEDÖVAR FIENDEN', { weapon: 'mirrorshield', wup: 'ms_bash' }],
  ['skyddsringen', 'SKYDDSRINGEN', 'sallsynt', {}, 1, 'SKÖLDEN SKYDDAR\nRUNT OMKRING DIG', { weapon: 'mirrorshield', wup: 'ms_aura' }],
  ['pareringen', 'PARERINGEN', 'sallsynt', {}, 1, 'PERFEKT PARERING\nLADDAR NÄSTA SLAG', { weapon: 'mirrorshield', wup: 'ms_parry' }],
  ['langsnarten', 'LÅNGSNÄRTEN', 'ovanlig', {}, 1, 'LÄNGRE RÄCKVIDD', { weapon: 'whip', wup: 'wh_reach' }],
  ['eldsnarten', 'ELDSNÄRTEN', 'sallsynt', {}, 1, 'PISKAN BRINNER OCH\nTÄNDER ELD PÅ FIENDER', { weapon: 'whip', wup: 'wh_fire' }],
  ['niosvansen', 'NIOSVANSEN', 'legendarisk', {}, 1, 'SLAGET TRÄFFAR\nTRE FIENDER', { weapon: 'whip', wup: 'wh_multi' }],
  ['oxdraget', 'OXDRAGET', 'ovanlig', {}, 1, 'DRAR ÄVEN STÖRRE\nFIENDER TILL DIG', { weapon: 'whip', wup: 'wh_pull' }],
  // ---- version 11: svamp, sporer, speglar, illusioner och glas (Svampriket och Spegelpalatset) ----
  // vanliga
  ['svamphatten', 'SVAMPHATTEN', 'vanlig', { sporeResist: 0.2 }, 3, '20 % MINDRE EFFEKT\nAV SPORER'],
  ['studssvampen', 'STUDSSVAMPEN', 'vanlig', { bounceHeight: 0.2 }, 3, '+20 % HÖGRE STUDS'],
  ['resestenen', 'RESESTENEN', 'vanlig', { teleportShield: 1 }, 3, '1 S OSÅRBAR EFTER\nEN TELEPORT'],
  ['polerduken', 'POLERDUKEN', 'vanlig', { reflectDmg: 0.2 }, 3, '+20 % SKADA PÅ\nSTUDSADE SKOTT'],
  ['klarsynsdroppen', 'KLARSYNSDROPPEN', 'vanlig', { illusionSight: 0.15 }, 3, '15 % CHANS ATT SE IGENOM\nILLUSIONER DIREKT'],
  ['glassplittret', 'GLASSPLITTRET', 'vanlig', { mirrorShards: 0.06 }, 3, '6 % CHANS ATT FIENDER\nSPLITTRAS I SKÄRVOR'],
  ['svampkorgen', 'SVAMPKORGEN', 'vanlig', { fungusHeal: 2 }, 3, '+2 HP NÄR DU DÖDAR\nEN SVAMPFIENDE'],
  ['myceltraden', 'MYCELTRÅDEN', 'vanlig', { whipReach: 1 }, 2, '+1 RUTA RÄCKVIDD FÖR\nPISKA OCH NÄRSTRID'],
  ['andningsduken', 'ANDNINGSDUKEN', 'vanlig', { sporeResist: 0.15, fungusHeal: 1 }, 3, '15 % MINDRE EFFEKT\nAV SPORER\n+1 HP PER SVAMPFIENDE', { unlock: 10 }],
  ['irrblosset', 'IRRBLOSSET', 'vanlig', { illusionSight: 0.1, teleportShield: 1 }, 3, '10 % CHANS ATT SE IGENOM\nILLUSIONER\n1 S OSÅRBAR EFTER TELEPORT', { unlock: 10 }],
  // ovanliga
  ['mycelmattan', 'MYCELMATTAN', 'ovanlig', { fungusHeal: 3, sporeResist: 0.2 }, 2, '+3 HP PER SVAMPFIENDE\n20 % MINDRE EFFEKT\nAV SPORER', { unlock: 15 }],
  ['fjaderskivlingen', 'FJÄDERSKIVLINGEN', 'ovanlig', { bounceHeight: 0.3, fallSafe: 0.15 }, 2, '+30 % HÖGRE STUDS\n15 % MINDRE FALLSKADA'],
  ['skarvpansaret', 'SKÄRVPANSARET', 'ovanlig', { reflectDmg: 0.25, mirrorShards: 0.05 }, 2, '+25 % SKADA PÅ\nSTUDSADE SKOTT\n5 % CHANS ATT FIENDER\nSPLITTRAS I SKÄRVOR'],
  ['portvaktarens_ring', 'PORTVAKTARENS RING', 'ovanlig', { teleportShield: 2, dodge: 0.03 }, 2, '2 S OSÅRBAR EFTER\nEN TELEPORT\n+3 % CHANS ATT UNDVIKA', { unlock: 15 }],
  ['hyfkedjan', 'HYFKEDJAN', 'ovanlig', { whipReach: 1, meleeDmg: 0.1 }, 2, '+1 RUTA RÄCKVIDD FÖR\nPISKA OCH NÄRSTRID\n+10 % NÄRSTRIDSSKADA'],
  ['maskbrytaren', 'MASKBRYTAREN', 'ovanlig', { illusionSight: 0.25, backstab: 0.15 }, 2, '25 % CHANS ATT SE IGENOM\nILLUSIONER DIREKT\n+15 % SKADA MOT\nOVETANDE FIENDER', { unlock: 20 }],
  ['flugsvampen', 'FLUGSVAMPEN', 'ovanlig', { fungusHeal: 4, bounceHeight: 0.25, sporeResist: -0.3 }, 1, '+4 HP PER SVAMPFIENDE\n+25 % HÖGRE STUDS\nSPORER 30 % STARKARE', { curse: true, bad: 1 }],
  // sällsynta
  ['sporkokongen', 'SPORKOKONGEN', 'sallsynt', { sporeResist: 0.4, regen: 0.3 }, 1, '40 % MINDRE EFFEKT\nAV SPORER\n+0,3 HP PER SEKUND', { unlock: 25 }],
  ['kalejdoskopet', 'KALEJDOSKOPET', 'sallsynt', { mirrorShards: 0.12, reflectDmg: 0.2 }, 1, '12 % CHANS ATT FIENDER\nSPLITTRAS I SKÄRVOR\n+20 % SKADA PÅ\nSTUDSADE SKOTT', { unlock: 30 }],
  ['tvillingporten', 'TVILLINGPORTEN', 'sallsynt', { teleportShield: 3, illusionSight: 0.2 }, 1, '3 S OSÅRBAR EFTER\nEN TELEPORT\n20 % CHANS ATT SE IGENOM\nILLUSIONER', { unlock: 25 }],
  ['mycelgreppet', 'MYCELGREPPET', 'sallsynt', { whipReach: 2, meleeDmg: 0.15, fungusHeal: 2 }, 1, '+2 RUTOR RÄCKVIDD FÖR\nPISKA OCH NÄRSTRID\n+15 % NÄRSTRIDSSKADA\n+2 HP PER SVAMPFIENDE', { unlock: 30 }],
  ['glaskroppen', 'GLASKROPPEN', 'sallsynt', { mirrorShards: 0.15, reflectDmg: 0.3, healMul: -0.25 }, 1, '15 % CHANS ATT FIENDER\nSPLITTRAS I SKÄRVOR\n+30 % SKADA PÅ\nSTUDSADE SKOTT\n-25 % HELNING', { curse: true, bad: 1 }],
  // legendariska
  ['urmycelet', 'URMYCELET', 'legendarisk', { sporeResist: 0.4, fungusHeal: 4, bounceHeight: 0.3, poisonChance: 0.1 }, 1, '40 % MINDRE EFFEKT\nAV SPORER\n+4 HP PER SVAMPFIENDE\n+30 % HÖGRE STUDS\n10 % CHANS ATT FÖRGIFTA', { unlock: 50 }],
  ['tusenspegeln', 'TUSENSPEGELN', 'legendarisk', { reflectDmg: 0.4, mirrorShards: 0.1, illusionSight: 0.3, teleportShield: 2 }, 1, '+40 % SKADA PÅ\nSTUDSADE SKOTT\n10 % CHANS TILL SKÄRVOR\n30 % SE IGENOM ILLUSIONER\n2 S OSÅRBAR EFTER TELEPORT', { unlock: 50 }],
  // ---- version 13: pakter och uppgraderingar för runboken och ångkanonen ----
  ['pakt_runbok', 'SKRIVARENS ED', 'sallsynt', { dmg: 0.15 }, 1, '+15 % SKADA\nALL AMMO BLIR BLÄCK\n4 UNIKA UPPGRADERINGAR\nBARA RUNBOK RESTEN AV RUNDAN', { pact: 'runebook', bad: 1 }],
  ['pakt_angkanon', 'PANNMÄSTARENS ED', 'sallsynt', { dmg: 0.15 }, 1, '+15 % SKADA\nALL AMMO BLIR BRÄNSLE\n4 UNIKA UPPGRADERINGAR\nBARA ÅNGKANON RESTEN AV RUNDAN', { pact: 'steamcannon', bad: 1 }],
  ['runklyvningen', 'RUNKLYVNINGEN', 'legendarisk', {}, 1, 'RUNORNA DELAR SIG\nVID TRÄFF', { weapon: 'runebook', wup: 'rb_split' }],
  ['sokarrunan', 'SÖKARRUNAN', 'ovanlig', {}, 1, 'STARKARE MÅLSÖKNING', { weapon: 'runebook', wup: 'rb_seek' }],
  ['pappersstormen', 'PAPPERSSTORMEN', 'sallsynt', {}, 1, 'SIDVIRVELN HÅLLER LÄNGRE\nOCH KASTAR TILLBAKA SKOTT', { weapon: 'runebook', wup: 'rb_ward' }],
  ['blackstanket', 'BLÄCKSTÄNKET', 'sallsynt', {}, 1, 'TRÄFFAR LÄMNAR BLÄCK\nSOM SAKTAR FIENDER', { weapon: 'runebook', wup: 'rb_ink' }],
  ['langroret', 'LÅNGRÖRET', 'ovanlig', {}, 1, 'LÄNGRE ÅNGKON', { weapon: 'steamcannon', wup: 'sc_range' }],
  ['skallningen', 'SKÅLLNINGEN', 'sallsynt', {}, 1, 'ÅNGAN SKÅLLAR:\nSKADA ÖVER TID', { weapon: 'steamcannon', wup: 'sc_scald' }],
  ['tryckstoten', 'TRYCKSTÖTEN', 'legendarisk', {}, 1, 'KNUFFAR HÅRDARE\nFIENDER SOM SLÅR I\nVÄGGAR TAR SKADA', { weapon: 'steamcannon', wup: 'sc_push' }],
  ['overtrycket', 'ÖVERTRYCKET', 'ovanlig', {}, 1, 'SNABBARE TRYCK', { weapon: 'steamcannon', wup: 'sc_fast' }],
  // ---- version 13: böcker, bläck, runor, ånga, smide och metall (Det förbjudna biblioteket och Gjuteriet) ----
  // vanliga
  ['blackhornet', 'BLÄCKHORNET', 'vanlig', { inkResist: 0.2 }, 3, '20 % MINDRE EFFEKT\nAV BLÄCK'],
  ['runpennan', 'RUNPENNAN', 'vanlig', { runeDmg: 0.12 }, 3, '+12 % SKADA MED RUNOR'],
  ['ventilnyckeln', 'VENTILNYCKELN', 'vanlig', { ventResist: 0.2 }, 3, '20 % MINDRE SKADA\nFRÅN ÅNGA'],
  ['kopparmunstycket', 'KOPPARMUNSTYCKET', 'vanlig', { steamDmg: 0.12 }, 3, '+12 % SKADA MED ÅNGA'],
  ['bokmarket', 'BOKMÄRKET', 'vanlig', { bookLore: 1 }, 2, '+1 EXTRA EFFEKT NÄR\nDU LÄSER EN PULPET'],
  ['smidestangen', 'SMIDESTÅNGEN', 'vanlig', { forgeArmor: 2 }, 3, '+2 RUSTNING PER DÖDAD\nGJUTERIFIENDE'],
  ['gjutarstovlarna', 'GJUTARSTÖVLARNA', 'vanlig', { beltSpeed: 0.2 }, 3, '+20 % FART PÅ RULLBAND\nÅT RÄTT HÅLL'],
  ['nithandsken', 'NITHANDSKEN', 'vanlig', { pressResist: 0.2 }, 3, '20 % MINDRE SKADA\nFRÅN STANSAR'],
  ['lasglaset', 'LÄSGLASET', 'vanlig', { bookLore: 1, inkResist: 0.1 }, 2, '+1 EXTRA PULPETEFFEKT\n10 % MINDRE EFFEKT\nAV BLÄCK', { unlock: 10 }],
  ['angvisslan', 'ÅNGVISSLAN', 'vanlig', { ventResist: 0.15, steamDmg: 0.08 }, 3, '15 % MINDRE SKADA\nFRÅN ÅNGA\n+8 % SKADA MED ÅNGA', { unlock: 10 }],
  // ovanliga
  ['runstampeln', 'RUNSTÄMPELN', 'ovanlig', { runeDmg: 0.2, inkResist: 0.15 }, 2, '+20 % SKADA MED RUNOR\n15 % MINDRE EFFEKT\nAV BLÄCK', { unlock: 15 }],
  ['anggallret', 'ÅNGGALLRET', 'ovanlig', { ventResist: 0.3, heatResist: 0.1 }, 2, '30 % MINDRE SKADA\nFRÅN ÅNGA\n-10 % HETTA OCH ELD'],
  ['stalforkladet', 'STÅLFÖRKLÄDET', 'ovanlig', { forgeArmor: 3, pressResist: 0.15 }, 2, '+3 RUSTNING PER DÖDAD\nGJUTERIFIENDE\n15 % MINDRE SKADA\nFRÅN STANSAR', { unlock: 15 }],
  ['assjans_klinga', 'ÄSSJANS KLINGA', 'ovanlig', { forgeArmor: 2, burnChance: 0.08 }, 2, '+2 RUSTNING PER DÖDAD\nGJUTERIFIENDE\n+8 % BRANDCHANS'],
  ['kopistens_lupp', 'KOPISTENS LUPP', 'ovanlig', { bookLore: 2, critChance: 0.05 }, 2, '+2 EXTRA EFFEKT NÄR\nDU LÄSER EN PULPET\n+5 % KRITCHANS', { unlock: 20 }],
  ['kilremmen', 'KILREMMEN', 'ovanlig', { beltSpeed: 0.3, moveSpeed: 0.05 }, 2, '+30 % FART PÅ RULLBAND\nÅT RÄTT HÅLL\n+5 % RÖRELSEHASTIGHET'],
  ['svartblacket', 'SVARTBLÄCKET', 'ovanlig', { runeDmg: 0.3, inkResist: -0.3 }, 1, '+30 % SKADA MED RUNOR\nBLÄCK 30 % STARKARE', { curse: true, bad: 1 }],
  // sällsynta
  ['eldskriften', 'ELDSKRIFTEN', 'sallsynt', { runeDmg: 0.3, bookLore: 1, burnChance: 0.08 }, 1, '+30 % SKADA MED RUNOR\n+1 EXTRA PULPETEFFEKT\n+8 % BRANDCHANS', { unlock: 30 }],
  ['angpannan', 'ÅNGPANNAN', 'sallsynt', { steamDmg: 0.3, ventResist: 0.3 }, 1, '+30 % SKADA MED ÅNGA\n30 % MINDRE SKADA\nFRÅN ÅNGA', { unlock: 25 }],
  ['jattens_stad', 'JÄTTENS STÄD', 'sallsynt', { forgeArmor: 4, pressResist: 0.25 }, 1, '+4 RUSTNING PER DÖDAD\nGJUTERIFIENDE\n25 % MINDRE SKADA\nFRÅN STANSAR', { unlock: 30 }],
  ['gjutarspaken', 'GJUTARSPAKEN', 'sallsynt', { beltSpeed: 0.4, pressResist: 0.2 }, 1, '+40 % FART PÅ RULLBAND\nÅT RÄTT HÅLL\n20 % MINDRE SKADA\nFRÅN STANSAR', { unlock: 25 }],
  ['smalthjartat', 'SMÄLTHJÄRTAT', 'sallsynt', { forgeArmor: 5, steamDmg: 0.25, ventResist: -0.4 }, 1, '+5 RUSTNING PER DÖDAD\nGJUTERIFIENDE\n+25 % SKADA MED ÅNGA\nÅNGA GÖR 40 % MER SKADA', { curse: true, bad: 1 }],
  // legendariska
  ['forbjudna_folianten', 'FÖRBJUDNA FOLIANTEN', 'legendarisk', { bookLore: 2, runeDmg: 0.3, inkResist: 0.3, xpMul: 0.1 }, 1, '+2 EXTRA PULPETEFFEKT\n+30 % SKADA MED RUNOR\n30 % MINDRE EFFEKT AV BLÄCK\n+10 % ERFARENHET', { unlock: 50 }],
  ['kolossens_hjarta', 'KOLOSSENS HJÄRTA', 'legendarisk', { forgeArmor: 4, steamDmg: 0.3, ventResist: 0.3, beltSpeed: 0.3 }, 1, '+4 RUSTNING PER DÖDAD\nGJUTERIFIENDE\n+30 % SKADA MED ÅNGA\n30 % MINDRE SKADA AV ÅNGA\n+30 % FART PÅ RULLBAND', { unlock: 50 }],
  // ---- version 15: pakter och uppgraderingar för rökelsekaret och bikastaren ----
  ['pakt_rokelsekar', 'MINISTRANTENS ED', 'sallsynt', { dmg: 0.15 }, 1, '+15 % SKADA\nRÖKELSEKARET BEHÖVER INGEN AMMO\n4 UNIKA UPPGRADERINGAR\nBARA RÖKELSEKAR RESTEN AV RUNDAN', { pact: 'censer', bad: 1 }],
  ['pakt_bikastare', 'BIODLARENS ED', 'sallsynt', { dmg: 0.15 }, 1, '+15 % SKADA\nALL AMMO BLIR BIN\n4 UNIKA UPPGRADERINGAR\nBARA BIKASTARE RESTEN AV RUNDAN', { pact: 'hivelauncher', bad: 1 }],
  ['langkedjan', 'LÅNGKEDJAN', 'ovanlig', {}, 1, 'LÄNGRE RÄCKVIDD', { weapon: 'censer', wup: 'cs_reach' }],
  ['vigda_roken', 'DEN VIGDA RÖKEN', 'sallsynt', {}, 1, 'RÖKEN LÄKER MER', { weapon: 'censer', wup: 'cs_heal' }],
  ['skarselden', 'SKÄRSELDEN', 'legendarisk', {}, 1, 'GLÖDEN SÄTTER FYR\nPÅ FIENDERNA', { weapon: 'censer', wup: 'cs_fire' }],
  ['snabbsvingen', 'SNABBSVINGEN', 'ovanlig', {}, 1, 'SNABBARE SVING', { weapon: 'censer', wup: 'cs_fast' }],
  ['svarmtiden', 'SVÄRMTIDEN', 'sallsynt', {}, 1, 'FLER BIN PER SKOTT', { weapon: 'hivelauncher', wup: 'hl_swarm' }],
  ['giftgadden', 'GIFTGADDEN', 'ovanlig', {}, 1, 'BINAS STICK FÖRGIFTAR', { weapon: 'hivelauncher', wup: 'hl_poison' }],
  ['drottninggelen', 'DROTTNINGGELÉN', 'legendarisk', {}, 1, 'IBLAND FLYGER EN DROTTNING\nSOM GÖR TREFALDIG SKADA', { weapon: 'hivelauncher', wup: 'hl_queen' }],
  ['flyghalet', 'FLYGHÅLET', 'ovanlig', {}, 1, 'SNABBARE SKOTT', { weapon: 'hivelauncher', wup: 'hl_fast' }],
  // ---- version 15: katedral, blod, ljus, klockor, bin, honung och vax (Blodkatedralen och Bikupan) ----
  // vanliga
  ['glasmalningen', 'GLASMÅLNINGEN', 'vanlig', { blessDur: 0.2 }, 3, '+20 % LÄNGRE VÄLSIGNELSE\nFRÅN LJUSSTRÅK'],
  ['vaxsulorna', 'VAXSULORNA', 'vanlig', { honeyResist: 0.2 }, 3, '20 % MINDRE INBROMSNING\nI HONUNG'],
  ['larvkroken', 'LARVKROKEN', 'vanlig', { larvaDmg: 0.15 }, 3, '+15 % SKADA MOT LARVER'],
  ['rokelsekornen', 'RÖKELSEKORNEN', 'vanlig', { censerHeal: 1 }, 2, '+1 HP PER TRÄFF MED\nRÖKELSEKARET'],
  ['bigadden', 'BIGADDEN', 'vanlig', { beeDmg: 0.12 }, 3, '+12 % SKADA MED BIN'],
  ['klockrepet', 'KLOCKREPET', 'vanlig', { bellStun: 1 }, 2, '+1 S LÄNGRE BEDÖVNING\nFRÅN KLOCKOR'],
  ['offerskalen', 'OFFERSKÅLEN', 'vanlig', { fontBreak: 4 }, 3, '+4 HP NÄR DU KROSSAR\nEN BLODFUNT'],
  ['helgonglorian', 'HELGONGLORIAN', 'vanlig', { holyDmg: 0.1 }, 3, '+10 % SKADA MEDAN DU\nÄR VÄLSIGNAD'],
  ['vaxljuset', 'VAXLJUSET', 'vanlig', { blessDur: 0.15, censerHeal: 1 }, 2, '+15 % LÄNGRE VÄLSIGNELSE\n+1 HP PER RÖKELSETRÄFF', { unlock: 10 }],
  ['honungskakan', 'HONUNGSKAKAN', 'vanlig', { honeyResist: 0.15, larvaDmg: 0.08 }, 3, '15 % MINDRE INBROMSNING\nI HONUNG\n+8 % SKADA MOT LARVER', { unlock: 10 }],
  // ovanliga
  ['kyrkklockan', 'KYRKKLOCKAN', 'ovanlig', { bellStun: 2, holyDmg: 0.08 }, 2, '+2 S LÄNGRE BEDÖVNING\nFRÅN KLOCKOR\n+8 % SKADA SOM VÄLSIGNAD', { unlock: 15 }],
  ['blodkalken', 'BLODKALKEN', 'ovanlig', { fontBreak: 6, lifesteal: 0.02 }, 2, '+6 HP NÄR DU KROSSAR\nEN BLODFUNT\n2 % AV SKADAN BLIR HP'],
  ['biodlarhandskarna', 'BIODLARHANDSKARNA', 'ovanlig', { beeDmg: 0.2, honeyResist: 0.15 }, 2, '+20 % SKADA MED BIN\n15 % MINDRE INBROMSNING\nI HONUNG', { unlock: 15 }],
  ['larvsaxen', 'LARVSAXEN', 'ovanlig', { larvaDmg: 0.25, poisonChance: 0.05 }, 2, '+25 % SKADA MOT LARVER\n+5 % CHANS ATT FÖRGIFTA'],
  ['myrran', 'MYRRAN', 'ovanlig', { censerHeal: 2, healMul: 0.1 }, 2, '+2 HP PER TRÄFF MED\nRÖKELSEKARET\n+10 % HELNING', { unlock: 20 }],
  ['rosettfonstret', 'ROSETTFÖNSTRET', 'ovanlig', { blessDur: 0.3, holyDmg: 0.1 }, 2, '+30 % LÄNGRE VÄLSIGNELSE\n+10 % SKADA SOM VÄLSIGNAD'],
  ['sota_fallan', 'DEN SÖTA FÄLLAN', 'ovanlig', { beeDmg: 0.3, honeyResist: -0.3 }, 1, '+30 % SKADA MED BIN\nHONUNG BROMSAR 30 % MER', { curse: true, bad: 1 }],
  // sällsynta
  ['klockarens_hammare', 'KLOCKARENS HAMMARE', 'sallsynt', { bellStun: 2, meleeDmg: 0.15, fontBreak: 5 }, 1, '+2 S LÄNGRE BEDÖVNING\nFRÅN KLOCKOR\n+15 % NÄRSTRIDSSKADA\n+5 HP PER KROSSAD FUNT', { unlock: 30 }],
  ['helgonreliken', 'HELGONRELIKEN', 'sallsynt', { holyDmg: 0.25, blessDur: 0.25 }, 1, '+25 % SKADA MEDAN DU\nÄR VÄLSIGNAD\n+25 % LÄNGRE VÄLSIGNELSE', { unlock: 25 }],
  ['yngelvaktaren', 'YNGELVAKTAREN', 'sallsynt', { larvaDmg: 0.3, honeyResist: 0.25 }, 1, '+30 % SKADA MOT LARVER\n25 % MINDRE INBROMSNING\nI HONUNG', { unlock: 30 }],
  ['rokelsemolnet', 'RÖKELSEMOLNET', 'sallsynt', { censerHeal: 3, regen: 0.2 }, 1, '+3 HP PER TRÄFF MED\nRÖKELSEKARET\n+0,2 HP PER SEKUND', { unlock: 25 }],
  ['blodsdopet', 'BLODSDOPET', 'sallsynt', { fontBreak: 10, holyDmg: 0.2, healMul: -0.25 }, 1, '+10 HP PER KROSSAD FUNT\n+20 % SKADA SOM VÄLSIGNAD\n-25 % HELNING', { curse: true, bad: 1 }],
  // legendariska
  ['kardinalens_ring', 'KARDINALENS RING', 'legendarisk', { holyDmg: 0.3, blessDur: 0.4, bellStun: 2, fontBreak: 6 }, 1, '+30 % SKADA SOM VÄLSIGNAD\n+40 % LÄNGRE VÄLSIGNELSE\n+2 S LÄNGRE KLOCKBEDÖVNING\n+6 HP PER KROSSAD FUNT', { unlock: 50 }],
  ['drottningens_krona', 'BIDROTTNINGENS KRONA', 'legendarisk', { beeDmg: 0.3, larvaDmg: 0.3, honeyResist: 0.3, poisonChance: 0.1 }, 1, '+30 % SKADA MED BIN\n+30 % SKADA MOT LARVER\n30 % MINDRE INBROMSNING\nI HONUNG\n10 % CHANS ATT FÖRGIFTA', { unlock: 50 }],
  // ---- version 16: pakter och uppgraderingar för trädgårdssaxen och drömstaven ----
  ['pakt_tradgardssax', 'HÄCKKLIPPARENS ED', 'sallsynt', { dmg: 0.15 }, 1, '+15 % SKADA\nSAXEN BEHÖVER INGEN AMMO\n4 UNIKA UPPGRADERINGAR\nBARA TRÄDGÅRDSSAX RESTEN AV RUNDAN', { pact: 'shears', bad: 1 }],
  ['pakt_dromstav', 'DRÖMVÄVARENS ED', 'sallsynt', { dmg: 0.15 }, 1, '+15 % SKADA\nALL AMMO BLIR DRÖMMAR\n4 UNIKA UPPGRADERINGAR\nBARA DRÖMSTAV RESTEN AV RUNDAN', { pact: 'dreamstaff', bad: 1 }],
  ['treklippet', 'TREKLIPPET', 'legendarisk', {}, 1, 'TRE KLIPP I STÄLLET\nFÖR TVÅ', { weapon: 'shears', wup: 'sh_triple' }],
  ['blodklippet', 'BLODKLIPPET', 'sallsynt', {}, 1, 'KLIPPEN GER BLÖDNING', { weapon: 'shears', wup: 'sh_bleed' }],
  ['saxkastet', 'SAXKASTET', 'sallsynt', {}, 1, 'KASTET GÖR MER SKADA', { weapon: 'shears', wup: 'sh_throw' }],
  ['snabbklippet', 'SNABBKLIPPET', 'ovanlig', {}, 1, 'SNABBARE KLIPP', { weapon: 'shears', wup: 'sh_fast' }],
  ['trogheten', 'TRÖGHETEN', 'ovanlig', {}, 1, 'STJÄRNAN SAKTAR NED\nI EN STÖRRE RADIE', { weapon: 'dreamstaff', wup: 'ds_slow' }],
  ['stjarnregnet', 'STJÄRNREGNET', 'legendarisk', {}, 1, 'STJÄRNAN SMÄLLER I\nTRE MINDRE STJÄRNOR', { weapon: 'dreamstaff', wup: 'ds_split' }],
  ['djupsomnen', 'DJUPSÖMNEN', 'sallsynt', {}, 1, 'FIENDERNA SOVER LÄNGRE', { weapon: 'dreamstaff', wup: 'ds_sleep' }],
  ['stjarnfallet', 'STJÄRNFALLET', 'ovanlig', {}, 1, 'SNABBARE STJÄRNA', { weapon: 'dreamstaff', wup: 'ds_fast' }],
  // ---- version 16: trädgård, rosor, törne, statyer, drömmar, sömn och mardrömmar (Den döda trädgården och Drömriket) ----
  // vanliga
  ['rosenhandsken', 'ROSENHANDSKEN', 'vanlig', { thornResist: 0.2 }, 3, '20 % MINDRE SKADA\nFRÅN TAGGRANKOR'],
  ['stenblicken', 'STENBLICKEN', 'vanlig', { angelSight: 1 }, 2, 'STENÄNGLAR STÅR STILLA\n+1 S EFTER ATT DU\nTITTAT BORT'],
  ['grensaxen', 'GRENSAXEN', 'vanlig', { shearDmg: 0.12 }, 3, '+12 % SKADA MED SAXEN'],
  ['somnsanden', 'SÖMNSANDEN', 'vanlig', { dreamDmg: 0.12 }, 3, '+12 % SKADA MED\nDRÖMSTAVEN'],
  ['dimlyktan', 'DIMLYKTAN', 'vanlig', { mistSight: 0.2 }, 3, '+20 % SIKT I\nSÖMNENS DIMMA'],
  ['fontanmyntet', 'FONTÄNMYNTET', 'vanlig', { fountainHeal: 5 }, 3, '+5 HP NÄR DU DRICKER\nUR EN FONTÄN'],
  ['dromnyckeln', 'DRÖMNYCKELN', 'vanlig', { shiftSense: 0.2 }, 3, 'GLIDANDE VÄGGAR ÖPPNAS\n20 % SNABBARE'],
  ['tuppfjadern', 'TUPPFJÄDERN', 'vanlig', { sleepResist: 0.2 }, 3, '20 % MINDRE EFFEKT\nAV SÖMN'],
  ['rosenvattnet', 'ROSENVATTNET', 'vanlig', { fountainHeal: 3, thornResist: 0.1 }, 2, '+3 HP FRÅN FONTÄNER\n10 % MINDRE SKADA\nFRÅN TAGGRANKOR', { unlock: 10 }],
  ['nattljuset', 'NATTLJUSET', 'vanlig', { mistSight: 0.15, sleepResist: 0.1 }, 3, '+15 % SIKT I\nSÖMNENS DIMMA\n10 % MINDRE EFFEKT AV SÖMN', { unlock: 10 }],
  // ovanliga
  ['barkhuden', 'BARKHUDEN', 'ovanlig', { thornResist: 0.25, thorns: 3 }, 2, '25 % MINDRE SKADA\nFRÅN TAGGRANKOR\n+3 TAGGSKADA'],
  ['stenangelns_tar', 'STENÄNGELNS TÅR', 'ovanlig', { angelSight: 2, dodge: 0.03 }, 2, 'STENÄNGLAR STÅR STILLA\n+2 S EFTER ATT DU\nTITTAT BORT\n+3 % CHANS ATT UNDVIKA', { unlock: 15 }],
  ['rosensaxen', 'ROSENSAXEN', 'ovanlig', { shearDmg: 0.2, bleedChance: 0.05 }, 2, '+20 % SKADA MED SAXEN\n+5 % CHANS TILL BLÖDNING'],
  ['stjarnstoftet', 'STJÄRNSTOFTET', 'ovanlig', { dreamDmg: 0.2, slowChance: 0.05 }, 2, '+20 % SKADA MED\nDRÖMSTAVEN\n+5 % CHANS ATT SAKTA NED', { unlock: 20 }],
  ['vakarstenen', 'VÄCKARSTENEN', 'ovanlig', { sleepResist: 0.25, mistSight: 0.15 }, 2, '25 % MINDRE EFFEKT AV SÖMN\n+15 % SIKT I\nSÖMNENS DIMMA'],
  ['nackrosen', 'NÄCKROSEN', 'ovanlig', { fountainHeal: 8, healMul: 0.1 }, 2, '+8 HP FRÅN FONTÄNER\n+10 % HELNING', { unlock: 15 }],
  ['valmon', 'VALMON', 'ovanlig', { dreamDmg: 0.3, sleepResist: -0.3 }, 1, '+30 % SKADA MED\nDRÖMSTAVEN\nSÖMN 30 % STARKARE', { curse: true, bad: 1 }],
  // sällsynta
  ['rankornas_moder', 'RANKORNAS MODER', 'sallsynt', { thornResist: 0.35, meleeResist: 0.1 }, 1, '35 % MINDRE SKADA\nFRÅN TAGGRANKOR\n10 % MINDRE NÄRSTRIDSSKADA', { unlock: 25 }],
  ['marmorhjartat', 'MARMORHJÄRTAT', 'sallsynt', { angelSight: 3, maxHp: 15 }, 1, 'STENÄNGLAR STÅR STILLA\n+3 S EFTER ATT DU\nTITTAT BORT\n+15 MAX HP', { unlock: 30 }],
  ['mastersaxen', 'MÄSTARSAXEN', 'sallsynt', { shearDmg: 0.3, meleeDmg: 0.1, thornResist: 0.15 }, 1, '+30 % SKADA MED SAXEN\n+10 % NÄRSTRIDSSKADA\n15 % MINDRE SKADA\nFRÅN TAGGRANKOR', { unlock: 25 }],
  ['ariadnes_trad', 'ARIADNES TRÅD', 'sallsynt', { shiftSense: 0.3, mistSight: 0.25 }, 1, 'GLIDANDE VÄGGAR ÖPPNAS\n30 % SNABBARE\n+25 % SIKT I\nSÖMNENS DIMMA', { unlock: 30 }],
  ['mardromsmasken', 'MARDRÖMSMASKEN', 'sallsynt', { dreamDmg: 0.35, mistSight: 0.3, sleepResist: -0.4 }, 1, '+35 % SKADA MED\nDRÖMSTAVEN\n+30 % SIKT I DIMMAN\nSÖMN 40 % STARKARE', { curse: true, bad: 1 }],
  // legendariska
  ['svarta_rosen', 'DEN SVARTA ROSEN', 'legendarisk', { thornResist: 0.4, shearDmg: 0.3, fountainHeal: 6, angelSight: 2 }, 1, '40 % MINDRE SKADA\nFRÅN TAGGRANKOR\n+30 % SKADA MED SAXEN\n+6 HP FRÅN FONTÄNER\nSTENÄNGLAR STÅR STILLA +2 S', { unlock: 50 }],
  ['jon_blunds_paraply', 'JON BLUNDS PARAPLY', 'legendarisk', { dreamDmg: 0.3, sleepResist: 0.4, mistSight: 0.3, shiftSense: 0.25 }, 1, '+30 % SKADA MED DRÖMSTAVEN\n40 % MINDRE EFFEKT AV SÖMN\n+30 % SIKT I DIMMAN\nGLIDANDE VÄGGAR ÖPPNAS\n25 % SNABBARE', { unlock: 50 }],
  // ---- version 17: pakter och uppgraderingar för kedjekulekanonen och syrasprutan ----
  ['pakt_kedjekanon', 'KAPARENS ED', 'sallsynt', { dmg: 0.15 }, 1, '+15 % SKADA\nALL AMMO BLIR KEDJEKULOR\n4 UNIKA UPPGRADERINGAR\nBARA KEDJEKANON RESTEN AV RUNDAN', { pact: 'chaincannon', bad: 1 }],
  ['pakt_syraspruta', 'ALKEMISTENS ED', 'sallsynt', { dmg: 0.15 }, 1, '+15 % SKADA\nALL AMMO BLIR SYRA\n4 UNIKA UPPGRADERINGAR\nBARA SYRASPRUTA RESTEN AV RUNDAN', { pact: 'acidsprayer', bad: 1 }],
  ['genomslaget', 'GENOMSLAGET', 'legendarisk', {}, 1, 'KULAN GÅR IGENOM\nSJU FIENDER', { weapon: 'chaincannon', wup: 'cc_pierce' }],
  ['virvelkulan', 'VIRVELKULAN', 'sallsynt', {}, 1, 'KULAN SNURRAR BREDARE\nOCH BEDÖVAR', { weapon: 'chaincannon', wup: 'cc_spin' }],
  ['brandkulan', 'BRANDKULAN', 'sallsynt', {}, 1, 'KULAN TÄNDER ELD', { weapon: 'chaincannon', wup: 'cc_fire' }],
  ['snabbladdaren', 'SNABBLADDAREN', 'ovanlig', {}, 1, 'SNABBARE OMLADDNING', { weapon: 'chaincannon', wup: 'cc_fast' }],
  ['fratsaret', 'FRÄTSÅRET', 'legendarisk', {}, 1, 'FRÄTNINGEN GER 35 %\nMER SKADA OCH VARAR LÄNGRE', { weapon: 'acidsprayer', wup: 'as_corrode' }],
  ['bredstralen', 'BREDSTRÅLEN', 'ovanlig', {}, 1, 'BREDARE STRÅLE', { weapon: 'acidsprayer', wup: 'as_spread' }],
  ['giftangorna', 'GIFTÅNGORNA', 'sallsynt', {}, 1, 'STRÅLEN LÄMNAR\nSYRAPÖLAR', { weapon: 'acidsprayer', wup: 'as_fumes' }],
  ['tryckpumpen', 'TRYCKPUMPEN', 'ovanlig', {}, 1, 'LÄNGRE STRÅLE', { weapon: 'acidsprayer', wup: 'as_fast' }],
  // ---- version 17: skeppet, kanoner, pirater, syra, flaskor, transmutation och teslaspolar (Spökskeppet och Laboratoriet) ----
  // vanliga
  ['sjobenen', 'SJÖBENEN', 'vanlig', { deckGrip: 0.2 }, 3, '20 % MER GREPP\nPÅ SKÖLJT DÄCK'],
  ['krutpungen', 'KRUTPUNGEN', 'vanlig', { cannonDmg: 0.15 }, 3, '+15 % SKADA MED KANONER'],
  ['kedjelanken', 'KEDJELÄNKEN', 'vanlig', { chainDmg: 0.12 }, 3, '+12 % SKADA MED\nKEDJEKULOR'],
  ['syrakolven', 'SYRAKOLVEN', 'vanlig', { acidDmg: 0.12 }, 3, '+12 % SKADA MED SYRA'],
  ['gummiforkladet', 'GUMMIFÖRKLÄDET', 'vanlig', { acidResist: 0.2 }, 3, '20 % MINDRE SKADA\nAV SYRA'],
  ['blysmycket', 'BLYSMYCKET', 'vanlig', { transmuteLuck: 0.2 }, 3, '+20 % TUR MED\nTRANSMUTATION'],
  ['jordkabeln', 'JORDKABELN', 'vanlig', { teslaResist: 0.25 }, 3, '25 % MINDRE SKADA\nFRÅN TESLASPOLAR'],
  ['destillatet', 'DESTILLATET', 'vanlig', { brewLuck: 0.15 }, 3, '15 % CHANS TILL STARK\nBRYGD I ALEMBIKEN'],
  ['tjarat_rep', 'TJÄRAT REP', 'vanlig', { deckGrip: 0.12, cannonDmg: 0.08 }, 2, '12 % MER GREPP\nPÅ SKÖLJT DÄCK\n+8 % SKADA MED KANONER', { unlock: 10 }],
  ['skyddsglasogonen', 'SKYDDSGLASÖGONEN', 'vanlig', { acidResist: 0.12, teslaResist: 0.12 }, 3, '12 % MINDRE SKADA AV SYRA\n12 % MINDRE SKADA\nFRÅN TESLASPOLAR', { unlock: 10 }],
  // ovanliga
  ['kaparbrevet', 'KAPARBREVET', 'ovanlig', { cannonDmg: 0.2, goldMul: 0.1 }, 2, '+20 % SKADA MED KANONER\n+10 % GULD'],
  ['kedjesmeden', 'KEDJESMEDEN', 'ovanlig', { chainDmg: 0.2, dmg: 0.04 }, 2, '+20 % SKADA MED\nKEDJEKULOR\n+4 % SKADA'],
  ['syrastanket', 'SYRASTÄNKET', 'ovanlig', { acidDmg: 0.2, poisonChance: 0.05 }, 2, '+20 % SKADA MED SYRA\n+5 % CHANS ATT FÖRGIFTA', { unlock: 15 }],
  ['guldlovet', 'GULDLÖVET', 'ovanlig', { transmuteLuck: 0.3, goldMul: 0.05 }, 2, '+30 % TUR MED\nTRANSMUTATION\n+5 % GULD'],
  ['faradays_bur', 'FARADAYS BUR', 'ovanlig', { teslaResist: 0.4, shockChance: 0.05 }, 2, '40 % MINDRE SKADA\nFRÅN TESLASPOLAR\n+5 % CHANS TILL BLIXT', { unlock: 15 }],
  ['brygdboken', 'BRYGDBOKEN', 'ovanlig', { brewLuck: 0.25, potionPower: 0.1 }, 2, '25 % CHANS TILL STARK\nBRYGD I ALEMBIKEN\n+10 % STARKARE DRYCKER'],
  ['rombuteljen', 'ROMBUTELJEN', 'ovanlig', { cannonDmg: 0.3, deckGrip: -0.3 }, 1, '+30 % SKADA MED KANONER\nDÄCKET 30 % HALARE', { curse: true, bad: 1 }],
  // sällsynta
  ['kaptenens_kompass', 'KAPTENENS KOMPASS', 'sallsynt', { deckGrip: 0.35, cannonDmg: 0.2, moveSpeed: 0.05 }, 1, '35 % MER GREPP\nPÅ SKÖLJT DÄCK\n+20 % SKADA MED KANONER\n+5 % RÖRELSEHASTIGHET', { unlock: 25 }],
  ['ankarkettingen', 'ANKARKETTINGEN', 'sallsynt', { chainDmg: 0.3, meleeResist: 0.1 }, 1, '+30 % SKADA MED\nKEDJEKULOR\n10 % MINDRE NÄRSTRIDSSKADA', { unlock: 30 }],
  ['salamanderhuden', 'SALAMANDERHUDEN', 'sallsynt', { acidResist: 0.35, maxHp: 15 }, 1, '35 % MINDRE SKADA\nAV SYRA\n+15 MAX HP', { unlock: 25 }],
  ['vises_sten', 'DE VISES STEN', 'sallsynt', { transmuteLuck: 0.4, brewLuck: 0.2, goldMul: 0.1 }, 1, '+40 % TUR MED\nTRANSMUTATION\n20 % CHANS TILL STARK BRYGD\n+10 % GULD', { unlock: 30 }],
  ['kvicksilverbagaren', 'KVICKSILVERBÄGAREN', 'sallsynt', { acidDmg: 0.35, transmuteLuck: 0.2, acidResist: -0.3 }, 1, '+35 % SKADA MED SYRA\n+20 % TUR MED\nTRANSMUTATION\nSYRA SKADAR 30 % MER', { curse: true, bad: 1 }],
  // legendariska
  ['hollandarens_ror', 'HOLLÄNDARENS ROR', 'legendarisk', { deckGrip: 0.4, cannonDmg: 0.3, chainDmg: 0.3, goldMul: 0.1 }, 1, '40 % MER GREPP PÅ DÄCK\n+30 % SKADA MED KANONER\n+30 % SKADA MED\nKEDJEKULOR\n+10 % GULD', { unlock: 50 }],
  ['smaragdtavlan', 'SMARAGDTAVLAN', 'legendarisk', { acidDmg: 0.3, acidResist: 0.3, transmuteLuck: 0.3, brewLuck: 0.2 }, 1, '+30 % SKADA MED SYRA\n30 % MINDRE SKADA AV SYRA\n+30 % TUR MED\nTRANSMUTATION\n20 % CHANS TILL STARK BRYGD', { unlock: 50 }],
  // ---- version 18: pakter och uppgraderingar för käglekastaren och blåsröret ----
  ['pakt_kaglekastare', 'JONGLÖRENS ED', 'sallsynt', { dmg: 0.15 }, 1, '+15 % SKADA\nALL AMMO BLIR KÄGLOR\n4 UNIKA UPPGRADERINGAR\nBARA KÄGLEKASTARE RESTEN AV RUNDAN', { pact: 'pinthrower', bad: 1 }],
  ['pakt_blasror', 'SCHAMANENS ED', 'sallsynt', { dmg: 0.15 }, 1, '+15 % SKADA\nALL AMMO BLIR GIFTPILAR\n4 UNIKA UPPGRADERINGAR\nBARA BLÅSRÖR RESTEN AV RUNDAN', { pact: 'blowgun', bad: 1 }],
  ['studskaglan', 'STUDSKÄGLAN', 'legendarisk', {}, 1, 'KÄGLORNA STUDSAR\nFYRA GÅNGER', { weapon: 'pinthrower', wup: 'pt_bounce' }],
  ['femte_kaglan', 'FEMTE KÄGLAN', 'sallsynt', {}, 1, 'FEM KÄGLOR PER KAST', { weapon: 'pinthrower', wup: 'pt_split' }],
  ['eldkaglorna', 'ELDKÄGLORNA', 'sallsynt', {}, 1, 'KÄGLORNA TÄNDER ELD', { weapon: 'pinthrower', wup: 'pt_fire' }],
  ['snabba_hander', 'SNABBA HÄNDER', 'ovanlig', {}, 1, 'SNABBARE OMLADDNING', { weapon: 'pinthrower', wup: 'pt_fast' }],
  ['pilgiftsgrodan', 'PILGIFTSGRODAN', 'sallsynt', {}, 1, 'GIFTET VARAR\nDUBBELT SÅ LÄNGE', { weapon: 'blowgun', wup: 'bg_poison' }],
  ['smygjagaren', 'SMYGJÄGAREN', 'ovanlig', {}, 1, 'TYST SKOTT OCH DUBBEL\nSKADA MOT OVETANDE', { weapon: 'blowgun', wup: 'bg_silent' }],
  ['ornogat', 'ÖRNÖGAT', 'legendarisk', {}, 1, 'HUVUDTRÄFFAR GER\nTREDUBBEL SKADA', { weapon: 'blowgun', wup: 'bg_crit' }],
  ['lungkraften', 'LUNGKRAFTEN', 'ovanlig', {}, 1, 'SNABBARE OMLADDNING', { weapon: 'blowgun', wup: 'bg_fast' }],
  // ---- version 18: rampljus, fallluckor, knivar, käglor, giftpilar, gift, idoler och lianer (Cirkusen och Djungeltemplet) ----
  // vanliga
  ['rampfebern', 'RAMPFEBERN', 'vanlig', { showtime: 0.1 }, 3, '+10 % SKADA I RAMPLJUSET'],
  ['scenvanan', 'SCENVANAN', 'vanlig', { trapdoorSense: 0.2 }, 3, '20 % LÄNGRE VARNING\nFÖR FALLLUCKOR'],
  ['ladervasten', 'LÄDERVÄSTEN', 'vanlig', { knifeResist: 0.2 }, 3, '20 % MINDRE SKADA\nAV KNIVAR'],
  ['kagelkulan', 'KÄGELKULAN', 'vanlig', { pinDmg: 0.12 }, 3, '+12 % SKADA MED KÄGLOR'],
  ['pilspetsen', 'PILSPETSEN', 'vanlig', { dartDmg: 0.12 }, 3, '+12 % SKADA MED\nGIFTPILAR'],
  ['motgiftet', 'MOTGIFTET', 'vanlig', { poisonResist: 0.2 }, 3, '20 % MINDRE GIFT'],
  ['lyckoamuletten', 'LYCKOAMULETTEN', 'vanlig', { idolLuck: 0.15 }, 3, '+15 % TUR MED IDOLER\nOCH LYCKOHJUL'],
  ['macheten', 'MACHETEN', 'vanlig', { vineWalk: 0.25 }, 3, '25 % MINDRE INBROMSNING\nI LIANER'],
  ['clownnasan', 'CLOWNNÄSAN', 'vanlig', { showtime: 0.06, trapdoorSense: 0.12 }, 2, '+6 % SKADA I RAMPLJUSET\n12 % LÄNGRE VARNING\nFÖR FALLLUCKOR', { unlock: 10 }],
  ['myggnatet', 'MYGGNÄTET', 'vanlig', { poisonResist: 0.12, vineWalk: 0.12 }, 3, '12 % MINDRE GIFT\n12 % MINDRE INBROMSNING\nI LIANER', { unlock: 10 }],
  // ovanliga
  ['cirkusaffischen', 'CIRKUSAFFISCHEN', 'ovanlig', { showtime: 0.15, goldMul: 0.05 }, 2, '+15 % SKADA I RAMPLJUSET\n+5 % GULD'],
  ['jonglorens_handskar', 'JONGLÖRENS HANDSKAR', 'ovanlig', { pinDmg: 0.2, dmg: 0.04 }, 2, '+20 % SKADA MED KÄGLOR\n+4 % SKADA'],
  ['curaren', 'CURAREN', 'ovanlig', { dartDmg: 0.2, poisonChance: 0.05 }, 2, '+20 % SKADA MED\nGIFTPILAR\n+5 % CHANS ATT FÖRGIFTA', { unlock: 15 }],
  ['knivtavlan', 'KNIVTAVLAN', 'ovanlig', { knifeResist: 0.35, meleeResist: 0.05 }, 2, '35 % MINDRE SKADA\nAV KNIVAR\n5 % MINDRE NÄRSTRIDSSKADA'],
  ['tempelkartan', 'TEMPELKARTAN', 'ovanlig', { idolLuck: 0.25, goldMul: 0.05 }, 2, '+25 % TUR MED IDOLER\nOCH LYCKOHJUL\n+5 % GULD', { unlock: 15 }],
  ['ormskinnet', 'ORMSKINNET', 'ovanlig', { poisonResist: 0.3, maxHp: 10 }, 2, '30 % MINDRE GIFT\n+10 MAX HP'],
  ['falska_bottnen', 'DEN FALSKA BOTTNEN', 'ovanlig', { pinDmg: 0.3, trapdoorSense: -0.3 }, 1, '+30 % SKADA MED KÄGLOR\n-30 % LUCKVARNING', { curse: true, bad: 1 }],
  // sällsynta
  ['direktorens_hatt', 'DIREKTÖRENS HATT', 'sallsynt', { showtime: 0.25, trapdoorSense: 0.25, goldMul: 0.05 }, 1, '+25 % SKADA I RAMPLJUSET\n25 % LÄNGRE VARNING\nFÖR FALLLUCKOR\n+5 % GULD', { unlock: 25 }],
  ['lejontamjarens_piska', 'LEJONTÄMJARENS PISKA', 'sallsynt', { knifeResist: 0.25, meleeResist: 0.1 }, 1, '25 % MINDRE SKADA\nAV KNIVAR\n10 % MINDRE NÄRSTRIDSSKADA', { unlock: 30 }],
  ['jaguartanden', 'JAGUARTANDEN', 'sallsynt', { dartDmg: 0.3, critChance: 0.04 }, 1, '+30 % SKADA MED\nGIFTPILAR\n+4 % KRITCHANS', { unlock: 25 }],
  ['solidolen', 'SOLIDOLEN', 'sallsynt', { idolLuck: 0.4, goldMul: 0.1, vineWalk: 0.2 }, 1, '+40 % TUR MED IDOLER\nOCH LYCKOHJUL\n+10 % GULD\n20 % MINDRE INBROMSNING\nI LIANER', { unlock: 30 }],
  ['ormgiftet', 'ORMGIFTET', 'sallsynt', { dartDmg: 0.35, poisonChance: 0.05, poisonResist: -0.3 }, 1, '+35 % SKADA MED\nGIFTPILAR\n+5 % CHANS ATT FÖRGIFTA\n-30 % GIFTSKYDD', { curse: true, bad: 1 }],
  // legendariska
  ['manegens_krona', 'MANEGENS KRONA', 'legendarisk', { showtime: 0.3, pinDmg: 0.3, knifeResist: 0.3, trapdoorSense: 0.3 }, 1, '+30 % SKADA I RAMPLJUSET\n+30 % SKADA MED KÄGLOR\n30 % MINDRE SKADA AV KNIVAR\n30 % LÄNGRE LUCKVARNING', { unlock: 50 }],
  ['ormens_fjader', 'ORMENS FJÄDER', 'legendarisk', { dartDmg: 0.3, poisonResist: 0.3, idolLuck: 0.3, vineWalk: 0.3 }, 1, '+30 % SKADA MED GIFTPILAR\n30 % MINDRE GIFT\n+30 % TUR MED IDOLER\n30 % LÄTTARE I LIANER', { unlock: 50 }],
];

// ---------- Set och synergier ----------
// Set: äger man 3 olika kort ur samma set får man setets bonus (räknas in i computeMods).
const SET_NEED = 3;
const SETS = {
  eld:    { name: 'ASKANS ORDEN',     text: '+10 % BRANDCHANS\n+10 % EXPLOSIONSCHANS\n+1 MAX GRANAT', mods: { burnChance: 0.1, explodeChance: 0.1, grenades: 1 } },
  frost:  { name: 'VINTERNS VAKT',    text: '+10 % CHANS ATT FRYSA\n+10 % CHANS ATT SAKTA NED\n-10 % SKADA FRÅN ELDKLOT', mods: { freezeChance: 0.1, slowChance: 0.1, projectileResist: 0.1 } },
  guld:   { name: 'GIRIGHETENS SKATT', text: '+20 % GULD\n+5 % RÄNTA VID NY VÅNING\n-10 % PRISER I BUTIKEN', mods: { goldMul: 0.2, interest: 0.05, shopDiscount: 0.1 } },
  krit:   { name: 'BÖDELNS BLICK',    text: '+5 % KRITCHANS\n+30 % KRITSKADA\n+1 HP PER KRITISK TRÄFF', mods: { critChance: 0.05, critDmg: 0.3, critHeal: 1 } },
  skugga: { name: 'SKUGGANS VÄG',     text: '+30 % SKADA MOT OVETANDE\n+5 % CHANS ATT UNDVIKA\nFIENDER SYNS PÅ KARTAN', mods: { backstab: 0.3, dodge: 0.05, enemySense: 1 } },
  luft:   { name: 'VINDENS BARN',     text: 'DUBBELHOPP\n+15 % SKADA I LUFTEN\n+5 % RÖRELSEHASTIGHET', mods: { doubleJump: 1, airDmg: 0.15, moveSpeed: 0.05 } },
  alkemi: { name: 'ALKEMISTENS LÄRA', text: '+20 % STARKARE DRYCKER\n+15 % FLER DRYCKER\n-10 % PRISER HOS ALKEMIST OCH PRÄST', mods: { potionPower: 0.2, potionChance: 0.15, npcDiscount: 0.1 } },
  flock:  { name: 'FLOCKENS BAND',    text: '+25 % STARKARE FÖLJESLAGARE\n+5 % CHANS TILL ALLIERADE\n+1 HP PER DÖDAD FIENDE', mods: { petPower: 0.25, allyChance: 0.05, killHeal: 1 } },
  aska:   { name: 'ASKANS ARV',       text: '-20 % SKADA FRÅN HETTA OCH ELD\n+15 % BRANDSKADA\n+5 % BRANDCHANS', mods: { heatResist: 0.2, fireDmg: 0.15, burnChance: 0.05 } },
  skuggor: { name: 'NATTENS VÄG', text: '+25 % SMYGSKADA\n20 % MINDRE LJUD\n15 % LÅNGSAMMARE UPPTÄCKT', mods: { stealthDmg: 0.25, noiseReduce: 0.2, detectSlow: 0.15 } },
  oknen:  { name: 'ÖKNENS GÅTA',      text: '+25 % GULD FRÅN HÖGAR OCH SARKOFAGER\n+1 SJÄL PER KRÖNIKESIDA\n-15 % SKADA FRÅN FÄLLOR', mods: { goldFind: 0.25, pageSouls: 1, trapResist: 0.15 } },
  jakt:   { name: 'JÄGARENS LÄRA',    text: '+20 % SKADA VID HUVUDTRÄFF\n10 % CHANS ATT PILEN KOMMER TILLBAKA\n+10 % TRÄFFSÄKERHET', mods: { headshot: 0.2, arrowRetrieve: 0.1, accuracy: 0.1 } },
  // version 8: DJUPETS VÄG (hav, simning och tidvatten) och PRISMANS VÄG (kristaller och ljusbrytning)
  djupet: { name: 'DJUPETS VÄG',      text: '+20 % SIMHASTIGHET\n+4 S LUFT UNDER VATTNET\n+20 % SKADA I VATTEN', mods: { swimSpeed: 0.2, airMax: 4, waterDmg: 0.2 } },
  prisman: { name: 'PRISMANS VÄG',    text: '+25 % SKADA MOT KRISTALLER\n+1 DELNING FRÅN BRYTANDE KRISTALLER\n+10 % ERFARENHET', mods: { crystalDmg: 0.25, refract: 1, xpMul: 0.1 } },
  // version 9: URVERKETS VÄG (Klocktornet: kugghjul, urverk och tid) och STORMENS VÄG (Molnborgen: åska och vind)
  urverket: { name: 'URVERKETS VÄG',  text: '+20 % FLER KUGGHJUL\n+5 % CHANS ATT SAKTA IN TRÄFFADE FIENDER\n+3 HP PER URVERKSSOLDAT', mods: { gearFind: 0.2, clockSlow: 0.05, rewindHeal: 3 } },
  stormen: { name: 'STORMENS VÄG',    text: '-25 % SKADA FRÅN BLIXTAR\n20 % MINDRE KNUFF FRÅN VIND\n+20 % SKADA NÄR FIENDER KNUFFAS IN I VÄGGAR', mods: { lightningResist: 0.25, windResist: 0.2, pushDmg: 0.2 } },
  // version 11: MYCELIETS VÄG (Svampriket: svampar och sporer) och SPEGELNS VÄG (Spegelpalatset: speglar, illusioner och glas)
  myceliet: { name: 'MYCELIETS VÄG',  text: '25 % MINDRE EFFEKT AV SPORER\n+2 HP PER DÖDAD SVAMPFIENDE\n+20 % HÖGRE STUDS', mods: { sporeResist: 0.25, fungusHeal: 2, bounceHeight: 0.2 } },
  spegeln: { name: 'SPEGELNS VÄG',    text: '+25 % SKADA PÅ STUDSADE SKOTT\n8 % CHANS ATT FIENDER SPLITTRAS I SKÄRVOR\n20 % CHANS ATT SE IGENOM ILLUSIONER', mods: { reflectDmg: 0.25, mirrorShards: 0.08, illusionSight: 0.2 } },
  // version 13: ARKIVETS VÄG (Det förbjudna biblioteket: böcker, bläck och runor) och SMEDJANS VÄG (Gjuteriet: smide, ånga och metall)
  arkivet: { name: 'ARKIVETS VÄG',    text: '25 % MINDRE EFFEKT AV BLÄCK\n+20 % SKADA MED RUNOR\n+1 EXTRA EFFEKT NÄR DU LÄSER EN PULPET', mods: { inkResist: 0.25, runeDmg: 0.2, bookLore: 1 } },
  smedjan: { name: 'SMEDJANS VÄG',    text: '+2 RUSTNING PER DÖDAD GJUTERIFIENDE\n+20 % SKADA MED ÅNGA\n20 % MINDRE SKADA FRÅN STANSAR', mods: { forgeArmor: 2, steamDmg: 0.2, pressResist: 0.2 } },
  // version 15: KATEDRALENS VÄG (Blodkatedralen: ljus, välsignelse och blod) och KUPANS VÄG (Bikupan: bin, honung och larver)
  katedralen: { name: 'KATEDRALENS VÄG', text: '+25 % LÄNGRE VÄLSIGNELSE FRÅN LJUSSTRÅK\n+15 % SKADA MEDAN DU ÄR VÄLSIGNAD\n+5 HP NÄR DU KROSSAR EN BLODFUNT', mods: { blessDur: 0.25, holyDmg: 0.15, fontBreak: 5 } },
  kupan:  { name: 'KUPANS VÄG',       text: '+20 % SKADA MED BIN\n25 % MINDRE INBROMSNING I HONUNG\n+20 % SKADA MOT LARVER', mods: { beeDmg: 0.2, honeyResist: 0.25, larvaDmg: 0.2 } },
  // version 16: TRÄDGÅRDENS VÄG (Den döda trädgården: törne, statyer och fontäner) och DRÖMMENS VÄG (Drömriket: dimma, sömn och drömstaven)
  tradgarden: { name: 'TRÄDGÅRDENS VÄG', text: '25 % MINDRE SKADA FRÅN TAGGRANKOR\nSTENÄNGLAR STÅR STILLA +1 S EFTER ATT DU TITTAT BORT\n+5 HP FRÅN FONTÄNER', mods: { thornResist: 0.25, angelSight: 1, fountainHeal: 5 } },
  // version 17: SKEPPETS VÄG (Spökskeppet: däck, kanoner och kedjekulor) och LABORATORIETS VÄG (Laboratoriet: syra, transmutation och brygder)
  skeppet: { name: 'SKEPPETS VÄG',    text: '25 % MER GREPP PÅ SKÖLJT DÄCK\n+25 % SKADA MED KANONER\n+20 % SKADA MED KEDJEKULOR', mods: { deckGrip: 0.25, cannonDmg: 0.25, chainDmg: 0.2 } },
  // version 18: CIRKUSENS VÄG (Cirkusen: rampljus, fallluckor och knivar) och TEMPLETS VÄG (Djungeltemplet: gift, idoler och lianer)
  cirkusen: { name: 'CIRKUSENS VÄG', text: '+25 % SKADA I RAMPLJUSET\n25 % LÄNGRE VARNING FÖR FALLLUCKOR\n20 % MINDRE SKADA AV KNIVAR', mods: { showtime: 0.25, trapdoorSense: 0.25, knifeResist: 0.2 } },
  templet: { name: 'TEMPLETS VÄG', text: '25 % MINDRE GIFT\n+25 % TUR MED IDOLER OCH LYCKOHJUL\n25 % MINDRE INBROMSNING I LIANER', mods: { poisonResist: 0.25, idolLuck: 0.25, vineWalk: 0.25 } },
  laboratoriet: { name: 'LABORATORIETS VÄG', text: '25 % MINDRE SKADA AV SYRA\n+25 % TUR MED TRANSMUTATION\n20 % CHANS TILL STARK BRYGD', mods: { acidResist: 0.25, transmuteLuck: 0.25, brewLuck: 0.2 } },
  drommen: { name: 'DRÖMMENS VÄG',    text: '+25 % SIKT I SÖMNENS DIMMA\n25 % MINDRE EFFEKT AV SÖMN\n+20 % SKADA MED DRÖMSTAVEN', mods: { mistSight: 0.25, sleepResist: 0.25, dreamDmg: 0.2 } },
};
// Synergitaggar: kort med samma tagg spelar bra ihop (t.ex. eld + explosion, krit + kritskada).
const SYN = { eld: 'ELD', krit: 'KRIT', gift: 'GIFT', frost: 'FROST', blixt: 'BLIXT', skold: 'SKÖLD', guld: 'GULD', liv: 'LIV', rusning: 'RUSNING', skugga: 'SKUGGA', granat: 'GRANAT',
  dryck: 'DRYCK', flock: 'FLOCK', blod: 'BLOD', narstrid: 'NÄRSTRID',
  runa: 'RUNOR', mana: 'MANA', jakt: 'JAKT', mat: 'MÅLTID', formaga: 'FÖRMÅGA', hemlig: 'HEMLIGHET',
  ljus: 'LAMPAN', spel: 'SPEL OCH BANK', vana: 'VAPENVANA', sjal: 'SJÄLAR',
  hav: 'HAVET', kristall: 'KRISTALL', kunskap: 'KUNSKAP', avgrund: 'AVGRUNDEN', hax: 'HÄXOR',
  urverk: 'URVERK', tid: 'TIDEN', vind: 'VINDEN', storm: 'STORMEN', hojd: 'HÖJDEN',
  svamp: 'SVAMPAR', spor: 'SPORER', spegel: 'SPEGLAR', illusion: 'ILLUSIONER', glas: 'GLAS',
  bok: 'BÖCKER', black: 'BLÄCK', anga: 'ÅNGA', smide: 'SMIDE', metall: 'METALL',
  kyrka: 'KATEDRALEN', helig: 'HELIGT LJUS', klocka: 'KLOCKOR', bi: 'BIN', honung: 'HONUNG', vax: 'VAX',
  tradgard: 'TRÄDGÅRDEN', ros: 'ROSOR', torne: 'TÖRNE', staty: 'STATYER', drom: 'DRÖMMAR', somn: 'SÖMN', mardrom: 'MARDRÖMMAR',
  skepp: 'SKEPPET', kanon: 'KANONER', pirat: 'PIRATER', syra: 'SYRA', flaska: 'FLASKOR', transmut: 'TRANSMUTATION', tesla: 'TESLASPOLAR',
  cirkus: 'CIRKUSEN', rampljus: 'RAMPLJUSET', kniv: 'KNIVAR', kagla: 'KÄGLOR', pil: 'GIFTPILAR', idol: 'IDOLER', djungel: 'DJUNGELN' };
// set och syn för alla kort samlas här: id: [set eller '', syn-taggar...]
const TAGS = {
  // eld och explosioner
  glodkol: ['eld', 'eld'], bronda_runan: ['eld', 'eld'], askkungen: ['eld', 'eld'], benflojt: ['eld', 'eld', 'granat'],
  tomrummet: ['eld', 'eld'], glad_trefot: ['eld', 'eld', 'granat'], agget: ['', 'eld', 'granat'], pirathatten: ['', 'eld'],
  // frost
  manesilver: ['frost', 'frost'], moln_nio: ['frost', 'frost'], kristallkronan: ['frost', 'frost'], vandringsstaven: ['frost', 'frost'],
  prismakronan: ['frost', 'frost', 'eld', 'gift', 'blixt'],
  // guld
  guldbaggen: ['guld', 'guld'], hangande_lappen: ['guld', 'guld'], att_gora: ['guld', 'guld'], idolen: ['guld', 'guld'],
  lyckokatten: ['guld', 'guld'], baronen: ['guld', 'guld'], packet: ['', 'guld'], horisonten: ['', 'guld', 'liv'], feltrycket: ['', 'guld'],
  // krit
  korsriddaren: ['krit', 'krit'], offerkniven: ['krit', 'krit'], glasogat: ['krit', 'krit', 'liv'], schablonen: ['krit', 'krit', 'liv'],
  sollinsen: ['krit', 'krit', 'eld'], solkonungen: ['', 'krit'], snedkronet: ['', 'krit', 'gift'],
  // skuggor
  regnbagsfjadern: ['skugga', 'skugga'], halvmane: ['skugga', 'skugga'], inbrottstjuven: ['skugga', 'skugga'], snedsteget: ['skugga', 'skugga', 'rusning'],
  spakortet: ['skugga', 'skugga'], maskerna: ['skugga', 'skugga'], ansiktslos: ['', 'skugga'],
  // luft och rörelse
  stovelremmen: ['luft', 'rusning'], fyllbulten: ['luft', 'rusning'], fyrfoten: ['luft', 'rusning'], akrobaten: ['luft'],
  gryningen: ['luft'], travstaven: ['luft', 'rusning'],
  // gift, blixt, sköld och liv
  grodan: ['', 'gift'], spakvinnan: ['', 'gift'],
  askstav: ['', 'blixt'], tankestormen: ['', 'blixt'], runsten: ['', 'blixt'],
  glorian: ['', 'skold'], stenmuren: ['', 'skold'], murbruket: ['', 'skold'], fyrkanten: ['', 'skold'], kubtornet: ['', 'skold'],
  vampyren: ['', 'liv'], seansen: ['', 'liv'], ouroboros: ['', 'liv'], lagerelden: ['', 'liv'], gronskan: ['', 'liv'], rotknuta: ['', 'liv'], eremiten: ['', 'liv'],
  // version 5: drycker (alkemi), följeslagare och allierade (flock), blödning och närstrid
  lakebladet: ['alkemi', 'dryck', 'liv'], groddrunan: ['alkemi', 'dryck'], blandbradet: ['alkemi', 'dryck'], haxkvasten: ['alkemi', 'dryck'],
  purpurkitteln: ['alkemi', 'dryck', 'liv'], overflodet: ['', 'dryck'], blomkrukan: ['', 'dryck', 'liv'],
  vargtanden: ['flock', 'flock'], dodsrunan: ['flock', 'flock'], flockens_horn: ['flock', 'flock'], trogna_anden: ['flock', 'flock'],
  dimvasen: ['flock', 'flock'], dodsbesvarjaren: ['flock', 'flock', 'liv'], spokspegeln: ['', 'flock'], trallbojan: ['', 'flock'],
  slaktkroken: ['', 'blod'], gapet: ['', 'blod', 'narstrid'], karmosinhjartat: ['', 'blod', 'narstrid', 'liv'], jarnnaven: ['', 'narstrid'],
  stenhjartat: ['', 'narstrid'], spegelskarvan: ['', 'narstrid'],
  eldrunan: ['aska', 'eld'], brinnande_tornet: ['aska', 'eld'], frosttoppen: ['frost', 'frost'], ishavet: ['', 'frost', 'skold'],
  bodelsnalen: ['krit', 'krit'], jagarogat: ['jakt', 'krit', 'jakt'], spejarkikaren: ['jakt', 'krit', 'jakt'],
  ristarboden: ['', 'guld'], marknadstaltet: ['', 'guld'], gavoasken: ['', 'guld'],
  // runor, mana, hetta (ASKANS ARV), pilar (JÄGARENS LÄRA), guld, vila, måltider, förmågor och hemligheter
  runristaren: ['', 'runa'], runskivan: ['', 'runa'], runkistan: ['', 'runa'], demonrunorna: ['', 'runa'],
  manastjarnan: ['', 'mana'], arkana_karnan: ['', 'mana', 'blixt'],
  askbrevet: ['aska', 'eld'], vulkanvaggen: ['aska', 'eld'], asktemplet: ['aska', 'eld'], frostglassen: ['', 'mat'],
  fjaderpennan: ['jakt', 'jakt'], jaktmarket: ['jakt', 'jakt', 'krit'], pilpungen: ['jakt', 'jakt'], stjarnskytten: ['jakt', 'jakt', 'krit'],
  hamstraren: ['', 'guld'], ballongerna: ['', 'guld'], vilostenen: ['', 'liv'], marketenterskan: ['', 'mat', 'liv'], pilgrimsfrukten: ['', 'mat'],
  blixtstenen: ['', 'formaga'], andekortet: ['', 'formaga'], svarta_gavan: ['', 'formaga'],
  blinken: ['', 'formaga'], tidsbubblan: ['', 'formaga'], skoldbubblan: ['', 'formaga'], valnadskallet: ['', 'formaga'], jordskalvet: ['', 'formaga'],
  stjarnkartan: ['', 'hemlig'], skattbrevet: ['', 'hemlig'], fullmanen: ['', 'hemlig'],
  // version 7: NATTENS VÄG (smyg, mörker och knivar) och ÖKNENS GÅTA (guld, gravkammare och faraonen)
  smygskorna: ['skuggor', 'skugga'], tystlaten: ['skuggor', 'skugga'], kastdolkarna: ['skuggor', 'skugga', 'krit'], skuggkappan: ['skuggor', 'skugga'],
  morkrets_furste: ['skuggor', 'skugga', 'ljus'], offerdolken: ['skuggor', 'krit', 'skugga'],
  guldsallet: ['oknen', 'guld'], gyllene_skarabeen: ['oknen', 'guld'], gravplundraren: ['oknen', 'guld', 'sjal'], faraonens_mask: ['oknen', 'guld', 'spel', 'sjal'],
  midasmasken: ['oknen', 'guld'],
  nattblinda_ogat: ['', 'skugga', 'ljus'], lyktbararen: ['', 'ljus'], lyktsmeden: ['', 'ljus'],
  lyckostjarnan: ['', 'spel'], guldfrot: ['', 'spel', 'guld'], bankirens_sigill: ['', 'spel', 'guld'], skuldbrevet: ['', 'spel'],
  ovningssvardet: ['', 'vana'], vapenboken: ['', 'vana'], blodiga_kronikan: ['', 'vana', 'sjal'], sjalastenen: ['', 'sjal'],
  // version 8: DJUPETS VÄG (havet) och PRISMANS VÄG (kristaller); kunskap, Avgrunden och häxor
  tidvattenstenen: ['djupet', 'hav'], dykarklockan: ['djupet', 'hav'], krakens_vrede: ['djupet', 'hav'], leviatans_fjall: ['djupet', 'hav'], sjoormen: ['djupet', 'hav'],
  roda_skarvan: ['prisman', 'kristall'], skarvlinsen: ['prisman', 'kristall'], kristallbrytaren: ['prisman', 'kristall'], regnbagsslipan: ['prisman', 'kristall'], glashjartat: ['prisman', 'kristall', 'hax'],
  simfenan: ['', 'hav'], parlbandet: ['', 'hav'], drunknarens_sang: ['', 'hav'],
  lardomens_ljus: ['', 'kunskap'], larlingens_dryck: ['', 'kunskap', 'liv'], visdomsstjarnan: ['', 'kunskap'], siarens_oga: ['', 'kunskap'],
  farjkarlens_obol: ['', 'avgrund'], avgrundsfyren: ['', 'avgrund', 'kunskap'], avgrundens_lofte: ['', 'avgrund', 'kunskap'], avgrundens_arkivarie: ['', 'avgrund', 'kunskap'],
  ronnbarskransen: ['', 'hax'], ronnskolden: ['', 'hax'], haxjagaren: ['', 'hax', 'avgrund'],
  // version 9: URVERKETS VÄG (Klocktornet) och STORMENS VÄG (Molnborgen); tid, vind och höjd
  kuggfickan: ['urverket', 'urverk'], stoppuret: ['urverket', 'urverk', 'tid'], massingsringen: ['urverket', 'urverk', 'tid'],
  pendelvikten: ['urverket', 'urverk', 'tid'], urmakarens_hjarta: ['urverket', 'urverk', 'tid'],
  askledaren: ['stormen', 'storm'], vindflojeln: ['stormen', 'vind'], stormhuvan: ['stormen', 'storm', 'vind'],
  askfangaren: ['stormen', 'storm', 'blixt'], stormfagelns_fjader: ['stormen', 'storm', 'vind', 'hojd'],
  urnyckeln: ['', 'urverk', 'liv'], trasiga_klockan: ['', 'urverk', 'tid'], sandglaset: ['', 'tid'], tidsvaktarens_sigill: ['', 'tid', 'formaga'],
  vaggsmallen: ['', 'vind'], tryckvagen: ['', 'vind'], virvelstenen: ['', 'vind', 'storm'], klattrarrepet: ['', 'hojd', 'vind'],
  fjaderfallet: ['', 'hojd'], svalvingarna: ['', 'hojd'], molnmyntet: ['', 'hojd', 'guld'], guldmolnet: ['', 'hojd', 'guld'],
  himlastegen: ['', 'hojd', 'guld'], stormens_skuld: ['', 'storm', 'guld'],
  // version 11: MYCELIETS VÄG (Svampriket) och SPEGELNS VÄG (Spegelpalatset); svampar, sporer, speglar, illusioner och glas
  svamphatten: ['myceliet', 'svamp', 'spor'], svampkorgen: ['myceliet', 'svamp', 'liv'], mycelmattan: ['myceliet', 'svamp', 'spor'],
  mycelgreppet: ['myceliet', 'svamp', 'narstrid'], urmycelet: ['myceliet', 'svamp', 'spor', 'gift'],
  polerduken: ['spegeln', 'spegel'], klarsynsdroppen: ['spegeln', 'illusion'], skarvpansaret: ['spegeln', 'spegel', 'glas'],
  maskbrytaren: ['spegeln', 'illusion', 'skugga'], kalejdoskopet: ['spegeln', 'glas', 'spegel'], tusenspegeln: ['spegeln', 'spegel', 'illusion', 'glas'],
  studssvampen: ['', 'svamp'], andningsduken: ['', 'spor', 'svamp'], fjaderskivlingen: ['', 'svamp', 'hojd'], flugsvampen: ['', 'svamp', 'spor'],
  sporkokongen: ['', 'spor', 'liv'], myceltraden: ['', 'svamp', 'narstrid'], hyfkedjan: ['', 'svamp', 'narstrid'],
  resestenen: ['', 'spegel'], portvaktarens_ring: ['', 'spegel'], irrblosset: ['', 'illusion', 'spegel'], tvillingporten: ['', 'spegel', 'illusion'],
  glassplittret: ['', 'glas'], glaskroppen: ['', 'glas', 'spegel'],
  // version 13: ARKIVETS VÄG (biblioteket) och SMEDJANS VÄG (gjuteriet); böcker, bläck, runor, ånga, smide och metall
  blackhornet: ['arkivet', 'black'], runpennan: ['arkivet', 'black', 'runa'], runstampeln: ['arkivet', 'runa', 'black'],
  eldskriften: ['arkivet', 'runa', 'bok', 'eld'], forbjudna_folianten: ['arkivet', 'bok', 'runa', 'black'],
  smidestangen: ['smedjan', 'smide', 'metall'], ventilnyckeln: ['smedjan', 'anga', 'metall'], stalforkladet: ['smedjan', 'smide', 'metall'],
  angpannan: ['smedjan', 'anga', 'metall'], kolossens_hjarta: ['smedjan', 'smide', 'anga', 'metall'],
  bokmarket: ['', 'bok'], lasglaset: ['', 'bok', 'black'], kopistens_lupp: ['', 'bok', 'krit'], svartblacket: ['', 'black', 'runa'],
  kopparmunstycket: ['', 'anga', 'metall'], angvisslan: ['', 'anga'], anggallret: ['', 'anga', 'metall'], smalthjartat: ['', 'smide', 'anga'],
  gjutarstovlarna: ['', 'metall', 'rusning'], kilremmen: ['', 'metall', 'rusning'], gjutarspaken: ['', 'metall'],
  nithandsken: ['', 'smide', 'metall'], assjans_klinga: ['', 'smide', 'eld'], jattens_stad: ['', 'smide', 'metall'],
  // version 15: KATEDRALENS VÄG (Blodkatedralen) och KUPANS VÄG (Bikupan); katedralen, heligt ljus, klockor, blod, bin, honung och vax
  glasmalningen: ['katedralen', 'helig', 'kyrka'], offerskalen: ['katedralen', 'kyrka', 'blod'], blodkalken: ['katedralen', 'blod', 'kyrka'],
  helgonreliken: ['katedralen', 'helig', 'kyrka'], kardinalens_ring: ['katedralen', 'kyrka', 'helig', 'klocka'],
  bigadden: ['kupan', 'bi', 'gift'], vaxsulorna: ['kupan', 'vax', 'honung'], biodlarhandskarna: ['kupan', 'bi', 'honung'],
  yngelvaktaren: ['kupan', 'bi', 'honung'], drottningens_krona: ['kupan', 'bi', 'honung', 'vax', 'gift'],
  rokelsekornen: ['', 'kyrka', 'liv'], myrran: ['', 'kyrka', 'liv'], rokelsemolnet: ['', 'kyrka', 'liv'], vaxljuset: ['', 'vax', 'helig'],
  helgonglorian: ['', 'helig'], rosettfonstret: ['', 'helig', 'glas'], blodsdopet: ['', 'blod', 'helig'],
  klockrepet: ['', 'klocka'], kyrkklockan: ['', 'klocka', 'kyrka'], klockarens_hammare: ['', 'klocka', 'narstrid'],
  larvkroken: ['', 'bi'], honungskakan: ['', 'honung', 'vax', 'bi'], larvsaxen: ['', 'bi', 'gift'], sota_fallan: ['', 'bi', 'honung'],
  // version 16: TRÄDGÅRDENS VÄG (Den döda trädgården) och DRÖMMENS VÄG (Drömriket); trädgården, rosor, törne, statyer, drömmar, sömn och mardrömmar
  rosenhandsken: ['tradgarden', 'torne', 'ros'], stenblicken: ['tradgarden', 'staty'], nackrosen: ['tradgarden', 'ros', 'tradgard', 'liv'],
  rankornas_moder: ['tradgarden', 'torne', 'tradgard'], svarta_rosen: ['tradgarden', 'ros', 'torne', 'staty', 'tradgard'],
  somnsanden: ['drommen', 'somn', 'drom'], dimlyktan: ['drommen', 'drom', 'ljus'], vakarstenen: ['drommen', 'somn'],
  ariadnes_trad: ['drommen', 'drom'], jon_blunds_paraply: ['drommen', 'drom', 'somn', 'mardrom'],
  grensaxen: ['', 'tradgard', 'narstrid'], fontanmyntet: ['', 'tradgard', 'liv'], rosenvattnet: ['', 'ros', 'tradgard', 'liv'],
  barkhuden: ['', 'torne', 'tradgard'], rosensaxen: ['', 'ros', 'tradgard', 'blod'], mastersaxen: ['', 'tradgard', 'narstrid', 'torne'],
  stenangelns_tar: ['', 'staty'], marmorhjartat: ['', 'staty', 'liv'],
  dromnyckeln: ['', 'drom'], tuppfjadern: ['', 'somn'], nattljuset: ['', 'somn', 'drom'], stjarnstoftet: ['', 'drom'],
  valmon: ['', 'somn', 'mardrom'], mardromsmasken: ['', 'mardrom', 'drom', 'somn'],
  // version 17: SKEPPETS VÄG (Spökskeppet) och LABORATORIETS VÄG (Laboratoriet); skeppet, kanoner, pirater, syra, flaskor, transmutation och teslaspolar
  sjobenen: ['skeppet', 'skepp'], krutpungen: ['skeppet', 'kanon'], kaptenens_kompass: ['skeppet', 'skepp', 'pirat'], ankarkettingen: ['skeppet', 'kanon', 'skepp'], hollandarens_ror: ['skeppet', 'skepp', 'pirat', 'kanon'],
  gummiforkladet: ['laboratoriet', 'syra'], blysmycket: ['laboratoriet', 'transmut', 'guld'], guldlovet: ['laboratoriet', 'transmut', 'guld'], salamanderhuden: ['laboratoriet', 'syra', 'flaska'], smaragdtavlan: ['laboratoriet', 'transmut', 'syra', 'flaska'],
  kedjelanken: ['', 'kanon', 'skepp'], syrakolven: ['', 'syra', 'flaska'], jordkabeln: ['', 'tesla', 'blixt'], destillatet: ['', 'flaska', 'dryck'], tjarat_rep: ['', 'skepp', 'kanon'], skyddsglasogonen: ['', 'syra', 'tesla'],
  kaparbrevet: ['', 'pirat', 'kanon', 'guld'], kedjesmeden: ['', 'kanon', 'metall'], syrastanket: ['', 'syra', 'gift'], faradays_bur: ['', 'tesla', 'blixt'], brygdboken: ['', 'flaska', 'dryck', 'transmut'],
  rombuteljen: ['', 'pirat', 'skepp'], vises_sten: ['', 'transmut', 'guld', 'flaska'], kvicksilverbagaren: ['', 'syra', 'transmut', 'flaska'],
  // version 18: CIRKUSENS VÄG (Cirkusen) och TEMPLETS VÄG (Djungeltemplet); cirkus, rampljus, knivar, käglor, giftpilar, idoler och djungeln
  rampfebern: ['cirkusen', 'rampljus', 'cirkus'], scenvanan: ['cirkusen', 'cirkus'], cirkusaffischen: ['cirkusen', 'rampljus', 'cirkus', 'guld'], direktorens_hatt: ['cirkusen', 'rampljus', 'cirkus'], manegens_krona: ['cirkusen', 'rampljus', 'kagla', 'kniv'],
  motgiftet: ['templet', 'gift', 'djungel'], lyckoamuletten: ['templet', 'idol'], ormskinnet: ['templet', 'gift', 'djungel', 'liv'], solidolen: ['templet', 'idol', 'djungel', 'guld'], ormens_fjader: ['templet', 'pil', 'idol', 'djungel'],
  ladervasten: ['', 'kniv'], kagelkulan: ['', 'kagla', 'cirkus'], pilspetsen: ['', 'pil', 'gift'], macheten: ['', 'djungel'], clownnasan: ['', 'cirkus', 'rampljus'], myggnatet: ['', 'djungel', 'gift'],
  jonglorens_handskar: ['', 'kagla', 'cirkus'], curaren: ['', 'pil', 'gift'], knivtavlan: ['', 'kniv', 'cirkus'], tempelkartan: ['', 'idol', 'guld'], falska_bottnen: ['', 'kagla', 'cirkus'],
  lejontamjarens_piska: ['', 'kniv', 'cirkus'], jaguartanden: ['', 'pil', 'djungel', 'krit'], ormgiftet: ['', 'pil', 'gift', 'idol'],
};

const ALL = DEFS.map(([id, name, rarity, mods, max, text, extra]) => {
  const c = Object.assign({ id, name, rarity, text, icon: 'assets/cards/' + id + '.png', mods, max }, extra || {});
  const t = TAGS[id];
  if (t) { if (t[0]) c.set = t[0]; if (t.length > 1) c.syn = t.slice(1); }
  return c;
});
const BY_ID = Object.create(null);
for (const c of ALL) BY_ID[c.id] = c;
// byId klarar också sammansmälta kort ('<id>+'), som skapas första gången de efterfrågas.
function byId(id) {
  if (typeof id !== 'string') return null;
  const c = BY_ID[id];
  if (c) return c;
  if (isFused(id)) {
    const b = BY_ID[baseId(id)];
    if (b && fusable(b)) return (BY_ID[id] = makeFused(b));
  }
  return null;
}
const setCards = setId => ALL.filter(c => c.set === setId);

// Antal olika ägda kort per set (ett sammansmält kort räknas som sitt grundkort)
function setCounts(ownedIds) {
  const seen = new Set(), n = {};
  for (const id of ownedIds || []) {
    const c = byId(id), b = baseId(id);
    if (!c || !c.set || seen.has(b)) continue;
    seen.add(b); n[c.set] = (n[c.set] || 0) + 1;
  }
  return n;
}
// [{ id, name, have, need: 3, active, text }] för alla set, påbörjade först
function setProgress(ownedIds) {
  const n = setCounts(ownedIds);
  return Object.keys(SETS).map(id => ({ id, name: SETS[id].name, have: Math.min(n[id] || 0, SET_NEED), need: SET_NEED, active: (n[id] || 0) >= SET_NEED, text: SETS[id].text, cards: setCards(id).map(c => c.id) }))
    .sort((a, b) => (b.have > 0) - (a.have > 0) || b.have - a.have);
}
// Kort skäl (svenska) till att kortet passar med de ägda korten, eller ''.
function synergy(card, ownedIds) {
  if (!card) return '';
  const owned = new Set((ownedIds || []).map(baseId));
  const self = baseId(card.id);
  if (card.set && SETS[card.set] && !owned.has(self)) {
    const have = setCounts(ownedIds)[card.set] || 0;
    if (have > 0 && have < SET_NEED) {
      const s = SETS[card.set];
      return have + 1 >= SET_NEED ? 'FULLBORDAR ' + s.name : s.name + ' ' + (have + 1) + '/' + SET_NEED;
    }
  }
  for (const tag of card.syn || []) {
    for (const id of owned) {
      if (id === self) continue;
      const o = BY_ID[id];
      if (o && card.active && o.active) continue; // en ny förmåga ersätter den gamla, det är ingen synergi
      if (o && o.syn && o.syn.includes(tag)) return (SYN[tag] || tag.toUpperCase()) + ' + ' + o.name;
    }
  }
  return '';
}

// ---------- Summering ----------
function computeMods(ownedIds) {
  const m = {};
  for (const k of KEYS) m[k] = 0;
  for (const id of ownedIds || []) {
    const c = byId(id); // '<id>+' ger det sammansmälta kortets starkare mods
    if (!c) continue;
    for (const k in c.mods) if (k in m) m[k] += c.mods[k];
  }
  const n = setCounts(ownedIds);
  for (const sid in n) if (n[sid] >= SET_NEED && SETS[sid]) for (const k in SETS[sid].mods) if (k in m) m[k] += SETS[sid].mods[k];
  for (const k of KEYS) m[k] = Math.round(m[k] * 1e6) / 1e6; // slipp flyttalsbrus
  return m;
}

// ---------- Effektrader med tal ----------
// [enhet, etikett]: p = andel (0,1 -> 10 %), n = tal, f = på/av. INVERT: högre värde är sämre.
const FMT = {
  dmg: ['p', 'SKADA'], fireRate: ['p', 'ELDHASTIGHET'], reloadSpeed: ['p', 'LADDNINGSHASTIGHET'], magSize: ['p', 'MAGASIN'],
  accuracy: ['p', 'TRÄFFSÄKERHET'], moveSpeed: ['p', 'RÖRELSEHASTIGHET'], maxHp: ['n', 'MAX HP'], armorPerFloor: ['n', 'RUSTNING PER VÅNING'],
  regen: ['n', 'HP PER SEKUND'], lifesteal: ['p', 'LIVSSTÖLD'], critChance: ['p', 'KRITCHANS'], critDmg: ['p', 'KRITSKADA'],
  pierce: ['n', 'GENOMSLAG'], extraPellets: ['n', 'KULOR PER SKOTT'], explodeChance: ['p', 'EXPLOSIONSCHANS'], burnChance: ['p', 'BRANDCHANS'],
  slowChance: ['p', 'CHANS ATT SAKTA NED'], killHeal: ['n', 'HP PER DÖDAD FIENDE'], killArmor: ['n', 'RUSTNING PER DÖDAD'], goldMul: ['p', 'GULD'],
  ammoMul: ['p', 'AMMO FRÅN FÖREMÅL'], healMul: ['p', 'HELNING'], dodge: ['p', 'CHANS ATT UNDVIKA'], thorns: ['n', 'TAGGSKADA'],
  damageTaken: ['p', 'SKADA DU TAR'], projectileResist: ['p', 'SKYDD MOT ELDKLOT'], meleeResist: ['p', 'SKYDD MOT NÄRSTRID'],
  magnet: ['n', 'RUTOR RÄCKVIDD'], luck: ['p', 'LYCKA'], extraLife: ['n', 'ÅTERUPPLIVNING'], ammoSave: ['p', 'GRATIS SKOTT'],
  shield: ['n', 'SKÖLD'], light: ['p', 'LJUS'], secretSense: ['f', 'HEMLIGA VÄGGAR PÅ KARTAN'], cardChoices: ['n', 'KORTVAL'],
  shopDiscount: ['p', 'RABATT I BUTIKEN'], bossDmg: ['p', 'SKADA MOT BOSS OCH ELIT'], firstShot: ['p', 'SKADA PÅ FÖRSTA SKOTTET'],
  lowHpDmg: ['p', 'SKADA VID LÅG HP'], speedOnKill: ['n', 'S FART EFTER DÖDANDE'], execute: ['p', 'AVRÄTTNINGSGRÄNS'],
  grenades: ['n', 'MAX GRANATER'], grenadeDmg: ['p', 'GRANATSKADA'], stamina: ['p', 'UTHÅLLIGHET'], dashCd: ['p', 'SNABBARE RUSNING'],
  airDmg: ['p', 'SKADA I LUFTEN'], backstab: ['p', 'SKADA MOT OVETANDE'], comboGold: ['n', 'GULD PER KOMBOSTEG'],
  trapResist: ['p', 'SKYDD MOT FÄLLOR'], freezeChance: ['p', 'CHANS ATT FRYSA'], poisonChance: ['p', 'CHANS ATT FÖRGIFTA'],
  shockChance: ['p', 'BLIXTCHANS'], interest: ['p', 'RÄNTA PER VÅNING'], floorHeal: ['n', 'HP PER VÅNING'],
  killExplode: ['p', 'CHANS ATT DÖDADE EXPLODERAR'], reloadNova: ['n', 'SKADA I OMLADDNINGSSTÖT'], eliteGold: ['p', 'GULD FRÅN ELIT'],
  trapSense: ['f', 'FÄLLOR PÅ KARTAN'], enemySense: ['f', 'FIENDER PÅ KARTAN'], critHeal: ['n', 'HP PER KRIT'], dashDmg: ['n', 'RUSNINGSSKADA'],
  shieldOnKill: ['n', 'SKÖLD PER DÖDAD'], ammoRegen: ['p', 'MAGASIN PER S I RESERVEN'], knockback: ['p', 'KNUFF'],
  chestChoice: ['n', 'VAL I KISTOR'], freeReroll: ['n', 'GRATIS NYA KORT PER VÅNING'], hazardImmune: ['f', 'IMMUN MOT LAVA, VATTEN, IS OCH NÄT'],
  doubleJump: ['f', 'DUBBELHOPP'],
  potionPower: ['p', 'STARKARE DRYCKER'], potionChance: ['p', 'FLER DRYCKER'], petPower: ['p', 'STARKARE FÖLJESLAGARE'],
  meleeDmg: ['p', 'NÄRSTRIDSSKADA'], fireDmg: ['p', 'BRANDSKADA'], coldResist: ['p', 'SKYDD MOT KÖLD OCH FROST'],
  headshot: ['p', 'SKADA VID HUVUDTRÄFF'], bleedChance: ['p', 'CHANS TILL BLÖDNING'], allyChance: ['p', 'CHANS TILL ALLIERADE'],
  lightRadius: ['n', 'LJUSRADIE'], weaponDrop: ['p', 'CHANS ATT ELIT TAPPAR VAPEN'], npcDiscount: ['p', 'RABATT HOS ALKEMIST OCH PRÄST'],
  runeSlots: ['n', 'RUNPLATSER'], runePower: ['p', 'STARKARE RUNOR'], heatResist: ['p', 'SKYDD MOT HETTA OCH ELD'],
  manaRegen: ['p', 'SNABBARE MANA'], arrowRetrieve: ['p', 'CHANS ATT PILEN KOMMER TILLBAKA'], questGold: ['p', 'GULD FRÅN UPPDRAG'],
  campfireHeal: ['p', 'BÄTTRE VILA VID LÄGERELDEN'], activeCd: ['p', 'KORTARE NEDRÄKNING'], secretChance: ['p', 'CHANS TILL HEMLIGA TRAPPOR'],
  mealPower: ['p', 'STARKARE MÅLTIDER'],
  stealthDmg: ['p', 'SMYGSKADA'], noiseReduce: ['p', 'MINDRE LJUD'], detectSlow: ['p', 'LÅNGSAMMARE UPPTÄCKT'],
  lampBattery: ['p', 'LAMPANS BATTERITID'], lampRadius: ['n', 'LAMPANS LJUSRADIE'], gambleLuck: ['p', 'BÄTTRE ODDS HOS SPELAREN'],
  bankInterest: ['p', 'RÄNTA PÅ BANKEN'], masteryXp: ['p', 'SNABBARE VAPENVANA'], pageSouls: ['n', 'SJÄLAR PER KRÖNIKESIDA'],
  goldFind: ['p', 'GULD FRÅN HÖGAR OCH SARKOFAGER'],
  swimSpeed: ['p', 'SIMHASTIGHET'], airMax: ['n', 'S LUFT UNDER VATTNET'], xpMul: ['p', 'ERFARENHET'], talentChoice: ['n', 'TALANGVAL'],
  crystalDmg: ['p', 'SKADA MOT KRISTALLER'], waterDmg: ['p', 'SKADA I VATTEN'], refract: ['n', 'KRISTALLDELNINGAR'],
  abyssSouls: ['p', 'SJÄLAR I AVGRUNDEN'], witchResist: ['p', 'KORTARE FÖRBANNELSER'], levelHeal: ['n', 'HP VID NY NIVÅ'],
  timeResist: ['p', 'SKYDD MOT TIDSBUBBLOR'], windResist: ['p', 'SKYDD MOT VIND'], fallSafe: ['p', 'SKYDD MOT FALL'],
  lightningResist: ['p', 'SKYDD MOT BLIXTAR'], pushDmg: ['p', 'SKADA VID KNUFF IN I VÄGG'], gearFind: ['p', 'FLER KUGGHJUL'],
  clockSlow: ['p', 'CHANS ATT SAKTA IN TRÄFFADE'], skyGold: ['p', 'GULD I MOLNBORGEN'], rewindHeal: ['n', 'HP PER URVERKSSOLDAT'],
  sporeResist: ['p', 'SKYDD MOT SPORER'], bounceHeight: ['p', 'HÖGRE STUDS'], teleportShield: ['n', 'S OSÅRBAR EFTER TELEPORT'],
  reflectDmg: ['p', 'SKADA PÅ STUDSADE SKOTT'], illusionSight: ['p', 'CHANS ATT SE IGENOM ILLUSIONER'], mirrorShards: ['p', 'CHANS TILL SKÄRVOR'],
  fungusHeal: ['n', 'HP PER SVAMPFIENDE'], whipReach: ['n', 'RUTOR RÄCKVIDD FÖR PISKA'],
  inkResist: ['p', 'SKYDD MOT BLÄCK'], beltSpeed: ['p', 'FART PÅ RULLBAND'], ventResist: ['p', 'SKYDD MOT ÅNGA'],
  runeDmg: ['p', 'SKADA MED RUNOR'], steamDmg: ['p', 'SKADA MED ÅNGA'], bookLore: ['n', 'EXTRA PULPETEFFEKT'],
  forgeArmor: ['n', 'RUSTNING PER GJUTERIFIENDE'], pressResist: ['p', 'SKYDD MOT STANSAR'],
  blessDur: ['p', 'LÄNGRE VÄLSIGNELSE'], honeyResist: ['p', 'SKYDD MOT HONUNG'], larvaDmg: ['p', 'SKADA MOT LARVER'],
  censerHeal: ['n', 'HP PER RÖKELSETRÄFF'], beeDmg: ['p', 'SKADA MED BIN'], bellStun: ['n', 'S LÄNGRE KLOCKBEDÖVNING'],
  fontBreak: ['n', 'HP PER KROSSAD BLODFUNT'], holyDmg: ['p', 'SKADA SOM VÄLSIGNAD'],
  thornResist: ['p', 'SKYDD MOT TAGGRANKOR'], angelSight: ['n', 'S STILLA STENÄNGLAR'], shearDmg: ['p', 'SKADA MED SAXEN'],
  dreamDmg: ['p', 'SKADA MED DRÖMSTAVEN'], mistSight: ['p', 'SIKT I SÖMNENS DIMMA'], fountainHeal: ['n', 'HP FRÅN FONTÄNER'],
  shiftSense: ['p', 'SNABBARE GLIDANDE VÄGGAR'], sleepResist: ['p', 'SKYDD MOT SÖMN'],
  deckGrip: ['p', 'GREPP PÅ SKÖLJT DÄCK'], cannonDmg: ['p', 'SKADA MED KANONER'], chainDmg: ['p', 'SKADA MED KEDJEKULOR'], acidDmg: ['p', 'SKADA MED SYRA'],
  acidResist: ['p', 'SKYDD MOT SYRA'], transmuteLuck: ['p', 'TUR MED TRANSMUTATION'], teslaResist: ['p', 'SKYDD MOT TESLASPOLAR'], brewLuck: ['p', 'CHANS TILL STARK BRYGD'],
  showtime: ['p', 'SKADA I RAMPLJUSET'], trapdoorSense: ['p', 'VARNING FÖR FALLLUCKOR'], knifeResist: ['p', 'SKYDD MOT KNIVAR'], pinDmg: ['p', 'SKADA MED KÄGLOR'],
  dartDmg: ['p', 'SKADA MED GIFTPILAR'], poisonResist: ['p', 'SKYDD MOT GIFT'], idolLuck: ['p', 'TUR MED IDOLER'], vineWalk: ['p', 'LÄTTARE I LIANER'],
};
const INVERT = { damageTaken: true };
const num = v => String(Math.round(v * 100) / 100).replace('.', ',');
// En rad per mod: { key, value, text: '+10 % SKADA', good }. Positivt = bra utom för INVERT-nycklar.
function modLines(cardOrMods) {
  const mods = cardOrMods && cardOrMods.mods ? cardOrMods.mods : (cardOrMods || {});
  const out = [];
  for (const key in mods) {
    const v = mods[key];
    if (!v || !FMT[key]) continue;
    const [u, label] = FMT[key];
    const sign = v > 0 ? '+' : '-';
    const text = u === 'f' ? label : u === 'p' ? sign + num(Math.abs(v) * 100) + ' % ' + label : sign + num(Math.abs(v)) + ' ' + label;
    out.push({ key, value: v, text, good: INVERT[key] ? v < 0 : v > 0 });
  }
  return out;
}

// ---------- Sammansmältning ----------
// Två exemplar av samma kort kan smältas ihop till '<id>+': samma kort med namn + '+', mods ×1,6
// (avrundat: andelar till hela procent, platta tal till heltal eller tiondelar, på/av oförändrat),
// ett steg sällsyntare (högst legendarisk) och samma bild. Pakter, vapenuppgraderingar och kort
// som bara kan tas en gång kan inte smältas.
const FUSE_MUL = 1.6;
const PLURAL = { KULA: 'KULOR', RUTA: 'RUTOR', GRANAT: 'GRANATER', RUNPLATS: 'RUNPLATSER', SJÄL: 'SJÄLAR', DELNING: 'DELNINGAR' }; // '+1 KULA' blir '+2 KULOR'
function isFused(id) { return typeof id === 'string' && id.length > 1 && id.charAt(id.length - 1) === '+'; }
function baseId(id) { return isFused(id) ? id.slice(0, -1) : id; }
function fusable(card) { return !!card && !card.fused && !card.pact && !card.weapon && !card.active && card.max >= 2; }
function fuseVal(key, v) {
  const u = FMT[key] ? FMT[key][0] : 'p';
  if (u === 'f' || !v) return v;
  const step = u === 'p' ? 0.01 : Number.isInteger(v) ? 1 : 0.1;
  let r = Math.round(v * FUSE_MUL / step) * step;
  if (Math.abs(r) <= Math.abs(v)) r = v + Math.sign(v) * step; // alltid märkbart starkare
  return Math.round(r * 1e6) / 1e6;
}
// Byter talen i kortets text mot de nya, i modsens ordning. Går det inte: rader ur modLines.
function fuseText(card, mods) {
  let text = card.text, pos = 0;
  for (const k in card.mods) {
    const f = FMT[k];
    if (!f || f[0] === 'f' || !card.mods[k]) continue;
    const show = v => num(Math.abs(v) * (f[0] === 'p' ? 100 : 1));
    const a = show(card.mods[k]), b = show(mods[k]);
    const re = new RegExp('(^|[^\\d,])' + a + '(?![\\d,])', 'g');
    re.lastIndex = pos;
    const m = re.exec(text);
    if (!m) { text = null; break; }
    const at = m.index + m[1].length;
    text = text.slice(0, at) + b + text.slice(at + a.length);
    pos = at + b.length;
  }
  if (text != null) return { text: text.replace(/\b(\d+) (MAX )?(KULA|RUTA|GRANAT|RUNPLATS|SJÄL|DELNING)(?![A-ZÅÄÖ])/g, (m, n, mx, w) => (n === '1' ? m : n + ' ' + (mx || '') + PLURAL[w])), bad: card.bad || 0 };
  const lines = modLines(mods), good = lines.filter(l => l.good), bad = lines.filter(l => !l.good);
  return { text: good.concat(bad).map(l => l.text).join('\n'), bad: bad.length };
}
function makeFused(base) {
  const mods = {};
  for (const k in base.mods) mods[k] = fuseVal(k, base.mods[k]);
  const ri = Math.min(RARITY_ORDER.length - 1, RARITY_ORDER.indexOf(base.rarity) + 1);
  const t = fuseText(base, mods);
  const c = Object.assign({}, base, {
    id: base.id + '+', name: base.name + '+', rarity: RARITY_ORDER[ri], mods, text: t.text,
    max: Math.max(1, Math.floor(base.max / 2)), fused: true, base: base.id,
  });
  if (base.syn) c.syn = base.syn.slice();
  delete c.unlock;
  if (t.bad) c.bad = t.bad; else delete c.bad;
  return c;
}
// fuse(id): id för det sammansmälta kortet ('<id>+'), eller null om kortet inte kan smältas.
function fuse(id) {
  const c = BY_ID[id];
  return fusable(c) ? byId(id + '+').id : null;
}
// canFuse(ägda id): id (i ordning) som finns i minst två exemplar och kan smältas.
function canFuse(ownedIds) {
  const n = new Map();
  for (const id of ownedIds || []) n.set(id, (n.get(id) || 0) + 1);
  const out = [];
  for (const [id, k] of n) if (k >= 2 && fusable(BY_ID[id])) out.push(id);
  return out;
}

// ---------- Förädling (vid lägerelden) ----------
// Samma regler som sammansmältning men det räcker med ett exemplar. Förbannade kort, pakter,
// vapenuppgraderingar, aktiva förmågor och redan sammansmälta kort kan inte förädlas.
function refinable(card) { return fusable(card) && !card.curse; }
// refine(id): id för det förädlade kortet ('<id>+'), eller null.
function refine(id) {
  const c = typeof id === 'string' ? BY_ID[id] : null;
  return refinable(c) ? byId(id + '+').id : null;
}
// canRefine(ägda id): olika id (i ordning) som kan förädlas.
function canRefine(ownedIds) {
  const out = [];
  for (const id of ownedIds || []) if (!out.includes(id) && refinable(BY_ID[id])) out.push(id);
  return out;
}

// ---------- Aktiva förmågor ----------
// activeOf(ägda id): kortet för den senast tagna aktiva förmågan (sist i listan), eller null.
function activeOf(ownedIds) {
  const list = ownedIds || [];
  for (let i = list.length - 1; i >= 0; i--) { const c = byId(list[i]); if (c && c.active) return c; }
  return null;
}

// ---------- Före och efter ----------
// fmtVal('dmg', 0.2) -> '20 %', fmtVal('maxHp', 25) -> '25', på/av -> 'PÅ'/'AV'
function fmtVal(key, v) {
  const u = FMT[key] ? FMT[key][0] : 'n';
  v = +v || 0;
  if (u === 'f') return v > 0 ? 'PÅ' : 'AV';
  return u === 'p' ? num(v * 100) + ' %' : num(v);
}
const modLabel = key => (FMT[key] ? FMT[key][1] : String(key).toUpperCase());
// diffLines(före, efter): en rad per nyckel som ändras: { key, label, before, after, text: 'SKADA 20 % → 30 %', good }
function diffLines(before, after) {
  before = before || {}; after = after || {};
  const out = [], seen = new Set();
  for (const key of Object.keys(after).concat(Object.keys(before))) {
    if (seen.has(key) || !FMT[key]) continue;
    seen.add(key);
    const a = Math.round((+before[key] || 0) * 1e6) / 1e6, b = Math.round((+after[key] || 0) * 1e6) / 1e6;
    if (a === b) continue;
    out.push({ key, label: modLabel(key), before: a, after: b, text: modLabel(key) + ' ' + fmtVal(key, a) + ' → ' + fmtVal(key, b), good: INVERT[key] ? b < a : b > a });
  }
  return out;
}
// preview(kort, nuvarande mods, ägda id): vad som ändras om man tar kortet (setbonusar räknas med).
// mods (t.ex. spelets M) är utgångsläget; utan mods används computeMods(ägda).
function preview(card, mods, ownedIds) {
  if (!card) return [];
  const owned = (ownedIds || []).slice();
  const base = computeMods(owned), next = computeMods(owned.concat([card.id]));
  const before = Object.assign({}, base, mods || {}), after = {};
  for (const k in next) after[k] = (before[k] || 0) + next[k] - base[k];
  const own = k => (card.mods && k in card.mods ? 0 : 1); // kortets egna effekter först, sedan setbonusar
  return diffLines(before, after).sort((a, b) => own(a.key) - own(b.key));
}

// ---------- Dragning ----------
// Vikten skiftar mot sällsyntare med djup (våning, 0..) och luck (summan av luck-modden, 0.1 per kort).
const CURSE_WEIGHT = 0.8; // förbannade kort dyker upp ibland
const PACT_WEIGHT = 0.4, UPGRADE_WEIGHT = 15; // trettiosex pakter (vikten sänkt så att alla pakter tillsammans syns lika ofta som de fjorton förut; version 13: 0,53 -> 0,49, version 15: 0,49 -> 0,46, version 16: 0,46 -> 0,43, version 17: 0,43 -> 0,4, version 18: oförändrad 0,4 med trettiosex pakter); uppgraderingarna väger lite mer sedan korthögen växt (version 11: 8 -> 9, version 13: 9 -> 10, version 15: 10 -> 11, version 16: 11 -> 12, version 17: 12 -> 13, version 18: 13 -> 15): en pakt i ungefär var fjärde dragning; efter pakten kommer uppgraderingarna tätt
function rarityWeight(rarity, depth, luck) {
  const t = Math.max(0, (depth || 0) * 0.25 + (luck || 0) * 2.5); // 0 = början av rundan
  const base = RARITY[rarity].weight;
  switch (rarity) {
    case 'vanlig': return base * Math.max(0.25, 1 - 0.3 * t);
    case 'ovanlig': return base * (1 + 0.2 * t);
    case 'sallsynt': return base * (1 + 0.8 * t);
    default: return base * (1 + 1.5 * t);
  }
}
function pickWeighted(rng, arr, fn) {
  if (rng && typeof rng.weighted === 'function') return rng.weighted(arr, fn);
  let total = 0;
  for (const a of arr) total += fn(a);
  let r = rng.next() * total;
  for (const a of arr) { r -= fn(a); if (r <= 0) return a; }
  return arr[arr.length - 1];
}
function draw(rng, n, opts) {
  opts = opts || {};
  const owned = {};
  for (const id of opts.owned || []) { const b = baseId(id); owned[b] = (owned[b] || 0) + (isFused(id) ? 2 : 1); } // '<id>+' är två exemplar
  const unlocked = opts.unlocked instanceof Set ? opts.unlocked : new Set(opts.unlocked || []);
  const depth = opts.depth || 0, luck = opts.luck || 0;
  // pakter: bara en per runda. Uppgraderingar: bara för vapnet man har svurit sig till, och då ofta.
  const pact = opts.pact || null;
  const pool = ALL.filter(c => (owned[c.id] || 0) < c.max && (!c.unlock || unlocked.has(c.id))
    && (c.pact ? !pact : true) && (c.weapon ? c.weapon === pact : true));
  const out = [];
  while (out.length < n && pool.length) {
    const c = pickWeighted(rng, pool, x => rarityWeight(x.rarity, depth, luck) * (x.curse ? CURSE_WEIGHT : 1) * (x.pact ? PACT_WEIGHT : x.weapon ? UPGRADE_WEIGHT : 1));
    out.push(c);
    pool.splice(pool.indexOf(c), 1);
  }
  return out;
}

// ---------- Pris ----------
function price(card, depth, discount) {
  const base = RARITY[card.rarity].price * (card.curse ? 0.8 : 1);
  const p = base * (1 + 0.12 * (depth || 0)) * (1 - Math.min(0.9, Math.max(0, discount || 0)));
  return Math.max(5, Math.round(p / 5) * 5);
}

// ---------- Försäljning ----------
// sellPrice(kort eller id, djup): guld för att sälja kortet, ungefär 40 % av butikspriset (utan rabatt).
// Förbannade kort ger 0 (de kostar guld att bli av med hos prästen), pakter och vapenuppgraderingar
// kan inte säljas (0). Ett sammansmält eller förädlat kort säljs som sin högre sällsynthet.
const SELL_SHARE = 0.4;
function sellPrice(card, depth) {
  if (typeof card === 'string') card = byId(card);
  if (!card || !RARITY[card.rarity] || card.curse || card.pact || card.weapon) return 0;
  return Math.max(5, Math.round(price(card, depth, 0) * SELL_SHARE / 5) * 5);
}
const canSell = card => sellPrice(card, 0) > 0;

const WEAPON_NAME = { pistol: 'PISTOL', shotgun: 'HAGELGEVÄR', rifle: 'GEVÄR', smg: 'KPIST', dbshotgun: 'DUBBELBÖSSA', crossbow: 'ARMBORST', flaregun: 'SIGNALPISTOL', sniper: 'PRICKSKYTTE',
  axe: 'YXA', flamer: 'ELDKASTARE', launcher: 'GRANATKASTARE', nailgun: 'SPIKGEVÄR', staff: 'BLIXTSTAV', bow: 'LÅNGBÅGE',
  knives: 'KASTKNIVAR', hammer: 'STRIDSHAMMARE', musket: 'MUSKÖT', harpoon: 'HARPUN', boomerang: 'BUMERANG', prism: 'PRISMA',
  sawlauncher: 'SÅGBLAD', windgun: 'VINDBÖSSA', spear: 'SPJUT', sporelauncher: 'SPORKASTARE', mirrorshield: 'SPEGELSKÖLD', whip: 'PISKA',
  runebook: 'RUNBOK', steamcannon: 'ÅNGKANON', censer: 'RÖKELSEKAR', hivelauncher: 'BIKASTARE',
  shears: 'TRÄDGÅRDSSAX', dreamstaff: 'DRÖMSTAV', chaincannon: 'KEDJEKANON', acidsprayer: 'SYRASPRUTA', pinthrower: 'KÄGLEKASTARE', blowgun: 'BLÅSRÖR' };
// etikett ovanför kortets namn: förbannelse, pakt, aktiv förmåga ('AKTIV · 8 S'), vilket vapen uppgraderingen hör till eller sammansmält
const activeTag = card => 'AKTIV · ' + num(card.cd || 0) + ' S';
function tag(card) {
  return card.curse ? 'FÖRBANNAD' : card.pact ? 'PAKT' : card.active ? activeTag(card) : card.weapon ? WEAPON_NAME[card.weapon] : card.fused ? 'SAMMANSMÄLT' : '';
}
function describe(card) {
  const r = RARITY[card.rarity];
  const head = card.name + ' (' + (tag(card) ? tag(card) + ' ' : '') + r.label + ')';
  return head + '\n' + card.text + (card.active ? '\nAKTIV FÖRMÅGA · NEDRÄKNING ' + num(card.cd || 0) + ' S' : '') + (card.max > 1 ? '\nKAN TAS ' + card.max + ' GÅNGER' : '')
    + (card.set && SETS[card.set] ? '\nSET: ' + SETS[card.set].name : '');
}

window.Cards = { ALL, byId, RARITY, RARITY_ORDER, MOD_KEYS, WEAPON_NAME, SETS, SYN, draw, computeMods, price, describe, tag, setProgress, synergy, modLines,
  fuse, canFuse, fusable, isFused, baseId, FUSE_MUL, refine, canRefine, refinable, activeOf, fmtVal, modLabel, diffLines, preview,
  sellPrice, canSell, SELL_SHARE };
})();
