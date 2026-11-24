'use strict';
// Skriver ut en genererad bana som ASCII: node tools/gen-preview.js <biom> [seed] [djup] [flaggor]
//   biom: dungeon | caves | graveyard | forest | courtyard | swamp | frost | volcano | tomb | crystal | sunken | clock | sky | fungus | mirror
//         | library | foundry | cathedral | hive | garden | dream | ship | lab | circus | jungle | mine | observatory | sewer | desert | prison | harbor | bathhouse | purgatory
//         | boss | boss:hall | boss:graveyard | boss:cave | boss:forest | boss:swamp | boss:frost | boss:volcano | boss:tomb | boss:crystal
//         | boss:sunken | boss:clock | boss:sky | boss:fungus | boss:mirror | boss:library | boss:foundry | boss:cathedral | boss:hive
//         | boss:garden | boss:dream | boss:ship | boss:lab | boss:circus | boss:jungle | boss:mine | boss:observatory | boss:sewer | boss:desert | boss:prison | boss:harbor | boss:bathhouse | boss:purgatory | random
//         (eller --biome=clock, --biome=fungus, --biome=library, --biome=foundry)
//   flaggor: --biome=swamp  --shop  --weapon=g (eller --weapon=axe, --weapon=harpoon, --weapon=Â, --weapon=spear, --weapon=Į, --weapon=whip, --weapon=Ŕ,
//            --weapon=runebook, --weapon=Ɓ, --weapon=censer, --weapon=Ɲ, --weapon=shears, --weapon=Ʋ, --weapon=chaincannon, --weapon=Ǭ, --weapon=pinthrower, --weapon=Ȏ, --weapon=pickaxe, --weapon=Ȫ)
//            --guardian=demon (vaktare på vanliga våningar, även frost/flame/pharaoh/crystalqueen/leviathan/clockmaker/thunderbird/mycelmother/mirrorking
//            /librarian/colossus/cardinal/queenbee/gardener/sandman/captain/alchemist/ringmaster/serpent/foreman/starseer)
//            --boss=ghost (bossens tema i arenan, även crystalqueen/leviathan/clockmaker/thunderbird/mycelmother/mirrorking/librarian/colossus
//            /cardinal/queenbee/gardener/sandman/captain/alchemist/ringmaster/serpent/foreman/starseer)
//            --secret (hemlig skattvåning, Gen.secret; biomen väljer utseendet, standard dungeon)
//            --maze (labyrint, Gen.maze; biomen väljer utseendet, standard dungeon)
//            --beams (visa ljusschakten som ~ och rullstenens bana som =)
//            --winds (visa vindrutorna som pilar > < v ^ i stället för ń)
//            --streams (version 22: visa eldfloderna ɰ som pilar > < v ^ i flödets riktning)
//            --teleports (visa teleporterparen som siffror 1 1, 2 2, 3 3 i stället för ť; paren listas alltid under rubriken)
//            --belts (visa rullbanden som pilar > < v ^ i stället för Ÿ; banden listas alltid under rubriken)
//            --arenas (version 14: rita arenarummens rektanglar: kanten som + och dörröppningarna som !; arenorna listas alltid under rubriken)
//            --shifts (version 16: visa de glidande väggarna ƣ som sin fas 0-3 (heltalssekunden); väggarna listas alltid under rubriken)
//            --sky (visa himmelmasken)  --floor (visa golvmasken)  --mask (visa rumsmasken)  --rooms (lista rummen med rumstyp)
//            --legend (teckenförklaring)  --n=3 (flera seeds i följd)  --stats (bara statistik över n banor: nya saker, fiendemix)
// Golv visas som . (alla golvtexturer), vaktarens/bossens golv som ` så att salen syns (--floor visar golvmasken).
// Exempel: node tools/gen-preview.js forest 123 3 --shop --rooms
//          node tools/gen-preview.js --biome=swamp 7 3 --legend
//          node tools/gen-preview.js --biome=frost 7 3 --rooms --guardian=frost
//          node tools/gen-preview.js boss:frost 3 --boss=frost
//          node tools/gen-preview.js --biome=volcano 7 3 --rooms --guardian=flame
//          node tools/gen-preview.js boss:volcano 3 --boss=flame
//          node tools/gen-preview.js --secret caves 5 --rooms
//          node tools/gen-preview.js --biome=tomb 7 3 --rooms --guardian=pharaoh --beams
//          node tools/gen-preview.js boss:tomb 3 --boss=pharaoh
//          node tools/gen-preview.js --maze tomb 4 --rooms
//          node tools/gen-preview.js --biome=crystal 7 3 --rooms --guardian=crystalqueen
//          node tools/gen-preview.js --biome=sunken 7 3 --rooms --floor   (golvmasken visar vattnet)
//          node tools/gen-preview.js boss:crystal 3 --boss=crystalqueen
//          node tools/gen-preview.js boss:sunken 3 --boss=leviathan
//          node tools/gen-preview.js --biome=clock 7 3 --rooms --guardian=clockmaker   (sågspår och tidsbubblor listas under kartan)
//          node tools/gen-preview.js --biome=sky 7 3 --winds --floor   (golvmasken visar tomrummet floor_void och vinden floor_wind)
//          node tools/gen-preview.js boss:clock 3 --boss=clockmaker
//          node tools/gen-preview.js boss:sky 3 --boss=thunderbird --winds
//          node tools/gen-preview.js --maze sky 4    /    node tools/gen-preview.js --secret clock 5
//          node tools/gen-preview.js caves 1 --stats --n=200
//          node tools/gen-preview.js --biome=courtyard 7 3 --rooms --legend   (version 10: nya fiender Ō ō Ŏ ŏ Ő ő, legendaltaret Œ)
//          node tools/gen-preview.js --biome=fungus 7 3 --rooms --guardian=mycelmother   (version 11: studsplattor ţ, sporpölar Ť, glödsvampar Ŧ)
//          node tools/gen-preview.js --biome=mirror 7 3 --rooms --teleports --guardian=mirrorking   (spegelväggar š, teleporterpar ť)
//          node tools/gen-preview.js boss:fungus 3 --boss=mycelmother    /    node tools/gen-preview.js boss:mirror 3 --boss=mirrorking --teleports
//          node tools/gen-preview.js --maze fungus 4    /    node tools/gen-preview.js --secret mirror 5    /    node tools/gen-preview.js mirror 1 --stats --n=100
//          node tools/gen-preview.js --biome=library 7 3 --rooms --guardian=librarian   (version 13: hyllrader ũ, pulpeter Ű, ljuskronor ű, bläckpölar Ŭ)
//          node tools/gen-preview.js --biome=dungeon 2 3 --arenas --rooms   (version 14: arenarum, nya rumstyper; --legend visar de nya fienderna)
//          node tools/gen-preview.js --biome=foundry 7 3 --rooms --belts --guardian=colossus   (rullband Ÿ, smält metall Ź, ångventiler ź, stansar Ż)
//          node tools/gen-preview.js boss:library 3 --boss=librarian    /    node tools/gen-preview.js boss:foundry 3 --boss=colossus --belts
//          node tools/gen-preview.js --maze library 4    /    node tools/gen-preview.js --secret foundry 5    /    node tools/gen-preview.js foundry 1 --stats --n=100
//          node tools/gen-preview.js --biome=cathedral 7 3 --rooms --guardian=cardinal   (version 15: långhus med bänkar Ǝ, fönster Ƌ, ljusstråk ƍ, blodfuntar Ə, klockor Ɛ)
//          node tools/gen-preview.js --biome=hive 7 3 --rooms --guardian=queenbee   (sexkantiga celler, honungskakor Ɣ, honung Ɩ, larvsäckar Ɨ, svärmar Ƙ)
//          node tools/gen-preview.js --biome=garden 7 3 --rooms --sky --guardian=gardener   (version 16: häckar Ɵ, trädgårdsmur Ơ, taggrankor ƥ, fontäner Ƨ)
//          node tools/gen-preview.js --biome=dream 7 3 --rooms --shifts --guardian=sandman   (glidande väggar ƣ, dimma Ʀ, falska dörrar Ʃ, drömlyktor ƪ)
//          node tools/gen-preview.js boss:dream 3 --boss=sandman --shifts    /    node tools/gen-preview.js cathedral 1 --stats --n=100
//          node tools/gen-preview.js --biome=ship 7 3 --rooms --sky --guardian=captain   (version 17: däck under himlen med master Ǔ, kanoner ǎ, ruttna plankor Ǎ)
//          node tools/gen-preview.js --biome=lab 7 3 --rooms --guardian=alchemist   (syrakar Ǜ, transmutationscirklar ǜ, teslaspolar Ǟ, alembiker ǟ)
//          node tools/gen-preview.js boss:ship 3 --boss=captain    /    node tools/gen-preview.js boss:lab 3 --boss=alchemist    /    node tools/gen-preview.js ship 1 --stats --n=100
//          node tools/gen-preview.js --biome=caves 4 3 --arenas --rooms   (version 17: gläntor/grottor som arenor, den andra nya rumstypen)
//          node tools/gen-preview.js --biome=circus 7 3 --rooms --guardian=ringmaster   (version 18: tältduk Ǯ, burar ǯ, fallluckor Ǳ, strålkastare ǲ, hjul ǳ Ǵ)
//          node tools/gen-preview.js --biome=jungle 7 3 --rooms --sky --guardian=serpent   (gläntor och stigar under himlen, tät djungel Ȁ, pirayavatten Ȃ, idoler Ȅ ȅ)
//          node tools/gen-preview.js boss:circus 3 --boss=ringmaster    /    node tools/gen-preview.js boss:jungle 3 --boss=serpent    /    node tools/gen-preview.js jungle 1 --stats --n=100
//          node tools/gen-preview.js --biome=mine 7 3 --rooms --guardian=foreman   (version 19: timmer Ȑ, malmådror ȑ, räls Ȗ med vagnbanor, gas ȗ, ras Ș)
//          node tools/gen-preview.js --biome=observatory 7 4 --rooms --guardian=starseer   (mässing ȓ, kupolspringor Ț, stjärnkartegolv ș, stjärnportar Ƞ)
//          node tools/gen-preview.js --biome=sewer 7 3 --rooms --guardian=ratking   (version 20: valvtegel Ȭ, rör ȭ, slam Ȳ, sprutrör ȳ, slussar ȷ med ratten ȶ)
//          node tools/gen-preview.js desert 7 4 --guardian=sphinx    /    node tools/gen-preview.js boss:sewer 3 --boss=ratking    /    node tools/gen-preview.js boss:desert 3 --boss=sphinx
//          node tools/gen-preview.js --biome=prison 7 3 --rooms --guardian=executioner   (version 21: fängelsesten ɇ, cellgaller Ɉ, larmplattor ɍ, burar ɏ)
//          node tools/gen-preview.js --biome=bathhouse 7 3 --rooms --guardian=bathmaster   (version 22: mosaik ɠ, pelare ɡ, heta bassänger ɣ, kallbad ɥ, ånggaller ɤ)
//          node tools/gen-preview.js purgatory 7 5 --streams --guardian=pyrelord   (eldfloder ɰ som pilar, runcirklar ɱ)    /    node tools/gen-preview.js boss:bathhouse 3 --boss=bathmaster    /    node tools/gen-preview.js boss:purgatory 3 --boss=pyrelord
//          node tools/gen-preview.js harbor 7 4 --floor --guardian=tidepriest   (djupt vatten Đ, bryggor i golvmasken, nät Ɏ, fiskmän ɚ)    /    node tools/gen-preview.js boss:prison 3 --boss=executioner    /    node tools/gen-preview.js boss:harbor 3 --boss=tidepriest
//          node tools/gen-preview.js boss:mine 3 --boss=foreman    /    node tools/gen-preview.js boss:observatory 3 --boss=starseer    /    node tools/gen-preview.js mine 1 --stats --n=100
const fs = require('fs');
const path = require('path');
global.window = global;
for (const f of ['rng.js', 'gen.js']) (0, eval)(fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8'));

const args = process.argv.slice(2), flags = args.filter(a => a.startsWith('--')), pos = args.filter(a => !a.startsWith('--'));
const flag = k => { const f = flags.find(a => a === '--' + k || a.startsWith('--' + k + '=')); return f ? (f.includes('=') ? f.split('=')[1] : true) : undefined; };
if (flag('biome') && flag('biome') !== true) pos.unshift(flag('biome'));
const biome = pos[0] || 'random';
const seed0 = pos[1] === undefined ? 1 : (/^\d+$/.test(pos[1]) ? +pos[1] : pos[1]);
const depth = +(pos[2] || 1);
const n = +(flag('n') || 1);
const LEGEND = [
  'väggar: 1-5 sten  6 skogsbryn  7 kyrkogårdsmur  8 grottberg  9 timmer  # demon  % best  ~ mardröm  & ogre  = vålnad',
  'D dörr  G grind  * hemlig vägg  P start  x utgång  B boss  Z vaktare  Q mimic  E elit  S K V I L N O R W fiender',
  'h hälsa  a ammo  A rustning  $ guld  C kista  M köpman  g r m d b s p vapen  f eldfat  o kruka  t träd  n gravsten',
  'c kandelaber  k likkista  j benhög  q bokhylla  u staty  v bur  w helande brunn  y förbannat altare  z spikfälla',
  'e explosiv tunna  i kristall  F svamp  H vapenställ  J bord  T trälåda   golv: ` vaktarens/bossens golv',
  'nya väggar: 0 träskvägg (vass/dött snår)',
  'nya fiender: U spindel  X fladdermus  Y helveteshund  ! bombskelett  @ sköldbärare  ^ svampman  + levande rustning (vilande)',
  'farliga golv: _ lava  - vatten  : is  " spindelväv      fällor: < pilplatta  > gasventil',
  'interaktiva (blockerar): ( städ  ) spåaltare  [ fångbur  ? utmaningsaltare  ; offerskål  / spak',
  'grindar/lås: | järngrind (öppnas med spaken)  ] låst dörr (öppnas med nyckeln)  { sprucken vägg (sprängs)',
  "föremål: , granatknippe  ' skattkarta  } nyckel",
  'version 5: väggar Ø frusen sten (frostfästet)  ¦ frostväktarens isvägg      vapen: å yxa  ä eldkastare  ö granatkastare',
  'nya fiender: Å ghoul  Ä kultist  Ö gargoyle (vilande staty)  É isvarg  Ü frostirrbloss',
  'NPC:er (blockerar): £ alkemist  € präst  © husdjursbur      ¥ dryck      Ç istapp (faller när den skjuts)',
  'frostfästet: salar och korridorer i Ø kring snögårdar under himlen (--sky visar gårdarna), : isfält/frusna sjöar',
  'version 6: väggar Ò obsidian (vulkanen)  ¤ flamväktarens glödande sten      vapen: é spikpistol  ü stav  ñ båge',
  'nya fiender: Ñ nekromantiker  Æ eldelementar  Þ lavamask (vid lavan)  Ð dödsriddare  Ý banshee',
  'rekvisita (blockerar): ¶ lägereld (viloplats)  ® anslagstavla  µ gifttunna  ß frosttunna  ÷ hemlig trappa (i hemligt rum)',
  'föremål: ª runsten  ð kött      fällor: ° eldstråle  ¬ smulande golv  ± pendelblad  ¨ tryckplatta (öppnar den hemliga väggen)',
  'vulkanen: obsidiansalar med lavafloder och broar kring askfält under röd himmel (--sky); --secret: hemlig skattvåning',
  'version 7: väggar È sandsten  Ì hieroglyfvägg (gravkammaren)  Ù faraonens vägg      vapen: ô kastknivar  û hammare  ï musköt',
  'nya fiender: Ã mumie  Õ skarabé (grupper om 3-5)  Ê schakalkrigare  Î tjuv  Ô dubbelgångare',
  'rekvisita (blockerar): ² sarkofag  ³ larmklocka      NPC:er: ç spelare  ÿ bankir  ý vandrare',
  'föremål: þ krönikesida  ¼ lampolja  ½ kaststenar      fällor: ¯ kvicksand  ¹ rullstensutlösare (level.boulders)',
  'gravkammaren: sandstenssalar, sandgångar och gårdar under ökensolen (--sky), ljusschakt (--beams); --maze: labyrint',
  'version 8: väggar Ą kristallvägg  Ć kristallåder  Ĉ kristalldrottningens vägg  Ċ ruinmur  Č korall  Ď leviatans vägg',
  'vapen: À harpun  Á bumerang  Â prisma      nya fiender: Ë kristallgolem  Í skärvirrbloss  Ï drunknad sjöman  Ó ål (i vattnet)',
  '  Ú siren  Û krabba  Ā skuggjägare  Ă häxa',
  'farliga golv: Đ djupt vatten (simma, luft)  Ē kristallspikar  Ĕ tidvatten (grunt, periodvis djupt: level.tide)  Ĝ luftbubblor (i vattnet)',
  'rekvisita (blockerar): Ė brytande kristall  Ę glödkristall (ljus)  Ě vrakkista  Ğ kartografen (NPC)  Ġ talangaltare      föremål: Ģ kunskapsbok',
  'kristallgrottorna: grottor i kristall med glödkristaller och spikfläckar; sjunkna staden: ruiner med bassänger, kanaler och tidvatten',
  'under översvämmade torg (--sky); --floor visar vattnets golv (floor_deepwater/floor_shallow)',
  'version 9: väggar Ĺ mässing  ĺ kuggvägg  Ļ urmakarens vägg  ļ molnsten  Ľ stormmur (molnborgens kant)  ľ stormfågelns vägg',
  'vapen: Į sågbladskastare  į vindbössa  Ĳ spjut      nya fiender: ĳ urverkssoldat  Ĵ kuggspindel (grupper om 3-5)  ĵ tidsväktare',
  '  Ķ harpya  ķ stormkallare  ĸ molnjätte',
  'faror: Ŀ sågspår (level.saws)  ŀ tidsbubbla  Ń tomrum/avgrund (ingen väg dit)  ń vindruta (level.winds; --winds visar riktningen)',
  'rekvisita (blockerar): Ņ urverk (ljus)  ņ blixtstång  Ň klockspel  ň molnkista      föremål: Ŋ kugghjul  ŋ fjäder',
  'klocktornet: mässingssalar med urverk, sågspår och tidsbubblor; molnborgen: öar (salar) och broar (korridorer) över tomrummet',
  'version 10, nya fiender (inbytta i stridsrummens grupper): Ō fångvaktare (kryptan)  ō grävare (grottorna)  Ŏ likgrävare (kyrkogården)',
  '  ŏ rotvätte (skogen, grupper om 2-3)  Ő armborstskytt (borggården, vid skydd)  ő paddjätte (träsket, nära vatten); sällsynta i grannbiomen',
  'rekvisita (blockerar): Œ legendaltaret (gör ett vapen legendariskt; ~12 % av banorna på djup 2+, i ett lugnt rum)',
  'version 11: väggar ŝ svampvägg (mycel)  Ş glödande svamphatt  ş mycelmoderns vägg  Š marmor  š spegelvägg (studsar skott)  Ţ spegelkungens vägg',
  'vapen: Ŕ sporkastare  ŕ spegelsköld  Ŗ piska      nya fiender: ŗ sporling (grupper om 3-5)  Ř mycelbest  ř svampshaman',
  '  Ś spegelriddare  ś illusionist  Ŝ glasskärva (grupper om 2-4)',
  'golvrutor (aldrig enda vägen): ţ studsplatta (kastar dig högt)  Ť sporpöl (förvirrar)  ť teleporter (i par: level.teleports; --teleports visar paren)',
  'rekvisita (blockerar): Ŧ glödsvamp (ljus)  ŧ spegelstaty      föremål: Ũ sporsäck (ammo till sporkastaren)',
  'svampriket: svampgrottor med glödsvampar, studsplattor och sporpölar; spegelpalatset: marmorsalar med spegelväggar och teleporterpar',
  'version 13: väggar ũ bokhylla (hyllrader och sträckor i väggarna)  Ū träpanel  ū bibliotekariens vägg  ŵ järnplåt  Ŷ smältugn (glöder)  ŷ smideskolossens vägg',
  'vapen: ƀ runboken  Ɓ ångkanonen      nya fiender: Ų flygande bok (grupper om 3-5)  ų bläckslem  Ŵ arkivariespöke',
  '  Ž smältgolem  ž ångautomat  ſ gnistdrönare (grupper om 2-4)',
  'golvrutor: Ŭ bläckpöl (halvblind, saktar; aldrig enda vägen)  Ź smält metall (som lava; kanaler med spänger)  ź ångventil (blåser periodvis)',
  '  Ÿ rullband (för dig i en riktning: level.belts; --belts visar riktningen)',
  'rekvisita: Ű pulpet (blockerar, läs boken)  ű ljuskrona (ljus, blockerar inte)  Ż stans/press (blockerar, slår ned var 3:e s)  ż städ/gjutform (blockerar)',
  'föremål: Ƃ bläckflaska (ammo till runboken)',
  'biblioteket: panelsalar med rader av fristående bokhyllor, pulpeter och bläckpölar; gjuteriet: plåtsalar med rullband, kanaler, ventiler och stansar',
  'version 14: nya fiender: Ƅ snöfantom (frost)  ƅ lavaorm (vulkanen, djup 2+, nära lava)  Ɔ skarabépräst (gravkammaren, djup 2+)',
  '  Ƈ kristallspindel (kristallgrottorna)  ƈ marulk (sjunkna staden, vid djupt vatten Đ/tidvatten Ĕ)  Ɖ vindande (molnborgen, djup 2+)',
  '  arenarum: level.arenas (ett stridsrum som låses när du går in, 2-3 vågor; --arenas ritar rektangeln)',
  '  nya rumstyper (befintliga tecken): pillargallery colonnade gravevault stonecircle stalagmites drownedcrypt icehall lavabridge obeliskhall',
  '  crystalnave drownedgallery assemblyhall windshrine capgarden statuegallery readingnook crateyard',
  'version 15: väggar Ɗ katedralsten  Ƌ blyinfattat glas (fönster)  ƌ kardinalens vägg  Ɠ vax  Ɣ honungskaka  ƕ bidrottningens vägg',
  'vapen: ƛ rökelsekaret  Ɲ bikastaren      nya fiender: Ƒ korgosse  ƒ botgörare  Ɯ kerub  Ƙ arbetsbi (svärmar om 3-6)  ƙ gaddkrigare (djup 2+)  ƚ larv',
  'golvrutor: ƍ ljusstråk (framför ett fönster, välsignar)  Ɩ honung (klibbig; aldrig enda vägen)',
  'rekvisita (blockerar): Ǝ kyrkbänk  Ə blodfunt (läker fiender, går sönder)  Ɛ klocka (ring: bedövar, väcker våningen; högst 2)  Ɨ larvsäck (kläcks)',
  'föremål: ƞ bikupa (ammo till bikastaren)',
  'blodkatedralen: långhus med bänkrader, mittgång och kor, dopkapell, klocktorn och kapell; bikupan: sexkantiga vaxceller, larvkammare och honungssalar',
  'version 16: väggar Ɵ häck  Ơ trädgårdsmur  ơ trädgårdsmästarens vägg  Ƣ drömvägg  ƣ glidande vägg (vägg/golv var 2:a s, level.shifts)  Ƥ Jon Blunds vägg',
  'vapen: Ʊ trädgårdssaxen  Ʋ drömstaven      nya fiender: ƫ stenängel (högst 2, djup 2+)  Ƭ taggranka (rotad)  ƭ trädgårdsdräng',
  '  Ʈ drömätare  Ư spegling (högst 2, djup 2+)  ư sömngångare (djup 2+)',
  'golvrutor: ƥ taggrankor (river, brinner; aldrig enda vägen)  Ʀ sömnens dimma',
  'rekvisita: Ƨ fontän (blockerar, drick: läker)  ƨ stenstaty (blockerar)  Ʃ falsk dörr (blockerar, väcker en fiende)  ƪ drömlykta (ljus, blockerar inte)',
  'föremål: Ƴ drömflaska (ammo till drömstaven)',
  'trädgården: häckrum, murade trädgårdar, fontängårdar och statygångar under himlen; drömriket: schackbrädesalar, glidande väggar, falska dörrar',
  'version 17: väggar ǒ skeppsskrov (relingen)  Ǔ mast och rigg  ǔ kaptenens vägg  Ǡ laboratoriekakel  ǡ hyllor med burkar  Ǣ alkemistens vägg',
  'vapen: Ǫ kedjekulekanonen  Ǭ syrasprutan      nya fiender: Ǖ spökpirat  ǖ kanonjär (djup 2+)  Ǘ drunknad matros  ǘ papegojspöke',
  '  Ǚ tentakel (högst 3, djup 2+)  ǚ skeppsråttor (svärmar om 4-7)  ǣ homunkulus  Ǥ slem  ǥ lärling  Ǧ kvicksilvergolem (djup 2+)  ǧ flaskgast  Ǩ kimär (högst 2, djup 2+)',
  'golvrutor (Ǎ Ǐ Ǜ aldrig enda vägen): Ǎ ruttna plankor (brakar igenom)  Ǐ sköljt däck (halt, vågor; bara på däck)  Ǜ syrakar  ǜ transmutationscirkel',
  'rekvisita: ǎ kanon (blockerar, vid relingen, avfyras)  ǐ skeppslykta (ljus)  Ǒ krutkagge  ǝ flaskhylla  Ǟ teslaspole (högst 3, aldrig vid dörr/i korridor)',
  '  ǟ alembik (blockerar, brygg en dryck; högst 2)      föremål: ǫ kulkista (ammo till kedjekulekanonen)  ǭ syraflaska (ammo till syrasprutan)',
  'spökskeppet: däck under natthimlen, kajutor, lastrum och kanondäck under däck; laboratoriet: verkstäder, burkhallar, teslakammare, transmutationssalar',
  '  andra nya rumstyper (befintliga tecken): guardroom bonepit mausoleum deadgrove tiltyard mangrove frostring basaltcolumns embalmery crystalgarden',
  '  sunkencolonnade gearhall skycolonnade fairyring mirrorgrid mapchamber boilerhall; gläntor/grottor som arenarum i de organiska biomerna (--arenas)',
  'version 18: väggar Ǯ tältduk  ǯ djurbur  ǰ direktörens vägg  ǿ djungelsten med mossa  Ȁ tät djungel  ȁ ormens vägg',
  'vapen: ǽ käglekastaren  Ȏ blåsröret      nya fiender: Ƿ clown  Ǹ jonglör  ǹ styltgångare (djup 2+)  Ǻ knivkastare  ǻ lejon (högst 2, djup 2+)  Ǽ marionett',
  '  Ȉ ödlekrigare  ȉ blåsrörsjägare  Ȋ apa  ȋ jaguar (högst 2, djup 2+)  Ȍ myggsvärm (3-5)  ȍ tempelväktare (högst 2, djup 2+)',
  'golvrutor (Ǳ Ȃ ȃ aldrig enda vägen): Ǳ fallucka  ǲ strålkastare (får ligga på vägen)  Ȃ pirayavatten (bara i gläntorna)  ȃ lianer (brinner)',
  'rekvisita: ǳ knivkastarhjul (högst 3, aldrig i korridor)  Ǵ lyckohjul (blockerar, snurra)  ǵ ballongklase  Ƕ glödlampsgirlang (ljus)  Ȅ guldidol (högst 1, bakhåll)',
  '  ȅ pilidol (högst 4, ingen dörr/öppning inom 3 rutor i fri rak linje)  Ȇ giftblomma  ȇ tikifackla (ljus, blockerar)      föremål: Ǿ kägellåda  ȏ pilkoger',
  'cirkusen: manegen, burgången, artistlogen, nöjesfältet (inomhus); djungeltemplet: tempelsal, offeraltare, den rasade trappan, gläntor och flodbäddar',
  '  djungeltemplet har rullstensfällor ¹ i ~50 % av banorna (--beams visar banan)',
  'version 19: väggar Ȑ timrad stoll  ȑ malmåder  Ȓ förmannens vägg  ȓ mässingspanel  Ȕ stjärnkarta  ȕ stjärnskådarens vägg',
  'vapen: ȩ hackan  Ȫ stjärnlansen      nya fiender: ȡ gruvarbetare  Ȣ kolgolem (högst 2, djup 2+)  ȣ mullvadsman  Ȥ gnistlykta',
  '  ȥ stjärnfödd  Ȧ astronom  ȧ urverksuggla  Ȩ tomrumsväktare (högst 2, djup 2+)',
  'golvrutor (Ȗ ȗ Ș Ț Ƞ aldrig enda vägen): Ȗ räls (level.carts: vagnbanor)  ȗ gasficka  Ș knakande tak  Ț kupolspringa  Ƞ stjärnport (par, level.starports)',
  '  ș stjärnkartegolv (låg tyngdkraft, får ligga på vägen)',
  'rekvisita: ț gruvvagn i vila  Ȝ dynamitlåda  ȝ karbidlampa (ljus)  Ȟ orrery  ȟ teleskop      föremål: ȫ stjärnstoftsflaska',
  'gruvan: lastplatsen, schaktet, malmgrottan, sprängkammaren, den rasade stollen; observatoriet: stora kupolen, planetariet, teleskopgalleriet, kartrummet',
  'version 20: väggar Ȭ valvtegel  ȭ rörvägg  Ȯ råttkungens vägg  ȯ ruinsten  Ȱ klippa  ȱ sfinxens vägg',
  'vapen: Ʉ kroksabeln  Ʌ fällkastaren      nya fiender: ȼ alligator (högst 2, djup 2+)  Ƚ slamvarelse  Ⱦ rörmokare  ȿ igel',
  '  ɀ skorpion  Ɂ nomad  ɂ sandvålnad (högst 2, djup 2+)  Ƀ gam      (råttorna ǚ även i kloakerna)',
  'golvrutor (Ȳ ȳ ȷ aldrig enda vägen): Ȳ slam  ȳ sprutrör  ȷ sluss (level.sluices, vägg när stängd)  ȴ oas (högst 2)  ȵ hägring  ¯ kvicksand (öknen)',
  'rekvisita: ȶ slussratt (en per bana med slussar)  ȸ råttbo  ȹ kaktus  Ⱥ amfora  Ȼ kokpanna (ljus)      föremål: Ɇ fällåda',
  'kloakerna: kanalsalen, pumprummet, råttboet, slussgången; öknen: ruinhovet, oasen, dynfältet, karavanlägret (gårdarna under himlen)',
  'version 21: väggar ɇ fängelsesten  Ɉ cellgaller  ɉ bödelns vägg  Ɋ bodvägg  ɋ kajsten  Ɍ tidvattenprästens vägg',
  'vapen: ɝ morgonstjärnan  ɞ trombonen      nya fiender: ɕ fångvaktare  ɖ kedjefånge  ɗ tortyrmästare (högst 2, djup 3+)  ɘ vakthund (i par)',
  '  ə drunknad fiskare  ɚ fiskman (högst 3, gömd i djupt vatten Đ intill gångbart)  ɛ krabba  ɜ måssvärm (flock om 3)',
  'golvrutor (aldrig enda vägen): ɍ larmplatta (högst 3)  Ɏ fisknät  Đ djupt vatten (fiskeläget; bryggplank runt det)',
  'rekvisita: ɏ hängande bur (blockerar inte)  ɐ sträckbänk  ɑ galge  ɒ fyrlykta (ljus)  ɓ fisktunna  ɔ ankare      föremål: ɟ skrotpåse',
  'fängelset: cellraden, vaktrummet, tortyrkammaren, galggården; fiskeläget: fiskhallen, bryggan, fyrplatsen, kajen (gårdarna under himlen)',
  'version 22: väggar ɠ mosaikmarmor  ɡ pelargång  ɢ badmästarens vägg  ɭ köttmur  ɮ benmur  ɯ eldfurstens vägg',
  'vapen: ɹ treudden  ɺ svavelmortern      nya fiender: ɩ badvakt  ɪ ångvålnad (djup 3+)  ɫ gladiator  ɬ mögelkrypare',
  '  ɵ eldimp  ɶ plågad själ (högst 4)  ɷ köttbjässe (djup 5+, högst 2)  ɸ askvandrare',
  'golvrutor: ɣ het bassäng, ɰ eldflod (level.streams), ɱ runcirkel (högst 3, aldrig nära start): aldrig enda vägen;  ɤ ånggaller  ɥ kallbad',
  'rekvisita: ɦ badstaty  ɧ fontän  ɨ bänk  ɲ kedjad själ  ɳ benpelare  ɴ svavelgryta (ljus)      föremål: ɻ svavelklump',
  'badhuset: bassänghallen, ångrummet, pelargången, hypokausten; skärselden: eldfloden, benfältet, själarnas dal, runplatsen (gårdarna under himlen)',
];
const OLD_EN = 'SKVILNORW', NEW_EN = 'UXY!@^+ÅÄÖÉÜÑÆÞÐÝÃÕÊÎÔËÍÏÓÚÛĀĂĳĴĵĶķĸ' + 'ŌōŎŏŐő' + 'ŗŘřŚśŜ' + 'ŲųŴŽžſ' + 'ƄƅƆƇƈƉ' + 'ƑƒƜƘƙƚ' + 'ƫƬƭƮƯư' + 'ǕǖǗǘǙǚǣǤǥǦǧǨ' + 'ǷǸǹǺǻǼȈȉȊȋȌȍ' + 'ȡȢȣȤȥȦȧȨ' + 'ȼȽȾȿɀɁɂɃ' + 'ɕɖɗɘəɚɛɜ' + 'ɩɪɫɬɵɶɷɸ';
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
  sporelings: 'ŗ', mycelbrutes: 'Ř', shamans: 'ř', mirrorknights: 'Ś', illusionists: 'ś', shardlings: 'Ŝ',
  bookshelves: 'ũ', lecterns: 'Ű', chandeliers: 'ű', inkpools: 'Ŭ', belts: 'Ÿ', molten: 'Ź', vents: 'ź', presses: 'Ż', molds: 'ż', furnaces: 'Ŷ',
  inkflasks: 'Ƃ', grimoires: 'Ų', inkslimes: 'ų', archivists: 'Ŵ', moltengolems: 'Ž', steambots: 'ž', sparkdrones: 'ſ',
  snowwraiths: 'Ƅ', lavaworms: 'ƅ', scarabpriests: 'Ɔ', crystalspiders: 'Ƈ', anglerfish: 'ƈ', windspirits: 'Ɖ',
  stainedglass: 'Ƌ', lightbeams: 'ƍ', pews: 'Ǝ', bloodfonts: 'Ə', churchbells: 'Ɛ', honeycomb: 'Ɣ', honey: 'Ɩ', larvasacs: 'Ɨ', beehives: 'ƞ', // version 15
  choirboys: 'Ƒ', flagellants: 'ƒ', cherubs: 'Ɯ', workerbees: 'Ƙ', stingerknights: 'ƙ', larvae: 'ƚ',
  hedges: 'Ɵ', gardenwalls: 'Ơ', shiftwalls: 'ƣ', thorns: 'ƥ', dreammist: 'Ʀ', fountains: 'Ƨ', statues2: 'ƨ', falsedoors: 'Ʃ', dreamlamps: 'ƪ', // version 16
  dreamflasks: 'Ƴ', weepingangels: 'ƫ', thornvines: 'Ƭ', gardeners: 'ƭ', dreameaters: 'Ʈ', doppelgangers: 'Ư', sleepwalkers: 'ư',
  masts: 'Ǔ', jarshelves: 'ǡ', rotplanks: 'Ǎ', wetdeck: 'Ǐ', acidvats: 'Ǜ', transmutes: 'ǜ', cannons: 'ǎ', shiplanterns: 'ǐ', powderkegs: 'Ǒ', // version 17
  flaskshelves: 'ǝ', teslacoils: 'Ǟ', alembics: 'ǟ', chainballs: 'ǫ', acidflasks: 'ǭ',
  ghostpirates: 'Ǖ', gunners: 'ǖ', drownedsailors: 'Ǘ', ghostparrots: 'ǘ', tentacles: 'Ǚ', rats: 'ǚ', homunculi: 'ǣ', oozes: 'Ǥ', apprentices: 'ǥ', mercurygolems: 'Ǧ',
  vialwisps: 'ǧ', chimeras: 'Ǩ',
  tents: 'Ǯ', cages: 'ǯ', junglestone: 'ǿ', junglewalls: 'Ȁ', trapdoors: 'Ǳ', spotlights: 'ǲ', piranhas: 'Ȃ', vines: 'ȃ', knifewheels: 'ǳ', prizewheels: 'Ǵ', // version 18
  balloons: 'ǵ', marquees: 'Ƕ', goldidols: 'Ȅ', dartidols: 'ȅ', poisonflowers: 'Ȇ', tikitorches: 'ȇ', pincrates: 'Ǿ', dartquivers: 'ȏ',
  clowns: 'Ƿ', jugglers: 'Ǹ', stiltwalkers: 'ǹ', knifethrowers: 'Ǻ', lions: 'ǻ', marionettes: 'Ǽ', lizardmen: 'Ȉ', blowgunners: 'ȉ', monkeys: 'Ȋ', jaguars: 'ȋ',
  mosquitoes: 'Ȍ', templeguardians: 'ȍ',
  timbers: 'Ȑ', oreveins: 'ȑ', brasswalls: 'ȓ', starcharts: 'Ȕ', rails: 'Ȗ', gaspockets: 'ȗ', caveins: 'Ș', starmaps: 'ș', domeslits: 'Ț', minecarts: 'ț', // version 19
  dynamite: 'Ȝ', carbidelamps: 'ȝ', orreries: 'Ȟ', telescopes: 'ȟ', starportals: 'Ƞ', stardust: 'ȫ', miners: 'ȡ', coalgolems: 'Ȣ', molemen: 'ȣ', sparkwisps: 'Ȥ',
  starspawns: 'ȥ', astronomers: 'Ȧ', clockowls: 'ȧ', voidwatchers: 'Ȩ',
  sewerbricks: 'Ȭ', pipewalls: 'ȭ', dunes: 'ȯ', mesas: 'Ȱ', sludge: 'Ȳ', steampipes: 'ȳ', oases: 'ȴ', mirages: 'ȵ', sluicewheels: 'ȶ', sluices: 'ȷ', // version 20
  ratnests: 'ȸ', cacti: 'ȹ', amphorae: 'Ⱥ', braziers: 'Ȼ', traps: 'Ɇ', alligators: 'ȼ', sludgemen: 'Ƚ', plumbers: 'Ⱦ', leeches: 'ȿ', scorpions: 'ɀ', nomads: 'Ɂ',
  sandwraiths: 'ɂ', vultures: 'Ƀ',
  prisonstone: 'ɇ', cellbars: 'Ɉ', shacks: 'Ɋ', quays: 'ɋ', alarmplates: 'ɍ', nets: 'Ɏ', hangcages: 'ɏ', racks: 'ɐ', gallows: 'ɑ', harborlamps: 'ɒ', // version 21
  fishbarrels: 'ɓ', anchors: 'ɔ', scrap: 'ɟ', turnkeys: 'ɕ', convicts: 'ɖ', torturers: 'ɗ', hounds: 'ɘ', drowned: 'ə', fishmen: 'ɚ', crabs: 'ɛ', gulls: 'ɜ',
  bathmosaic: 'ɠ', bathcolumns: 'ɡ', fleshwalls: 'ɭ', bonewalls: 'ɮ', hotpools: 'ɣ', steamvents: 'ɤ', coldpools: 'ɥ', firestreams: 'ɰ', runecircles: 'ɱ', // version 22
  bathstatues: 'ɦ', bathfountains: 'ɧ', bathbenches: 'ɨ', chainedsouls: 'ɲ', bonepillars: 'ɳ', brimpots: 'ɴ', brimstone: 'ɻ',
  attendants: 'ɩ', steamghosts: 'ɪ', gladiators: 'ɫ', moldcrawlers: 'ɬ', fireimps: 'ɵ', lostsouls: 'ɶ', fleshbrutes: 'ɷ', ashwalkers: 'ɸ' };
const arrow = b => (b.dx > 0 ? '>' : b.dx < 0 ? '<' : b.dy > 0 ? 'v' : '^');
const makeLevel = (seed, d, shop) => (flag('secret') ? Gen.secret(seed, { biome: biome === 'random' ? undefined : biome, depth: d })
  : flag('maze') ? Gen.maze(seed, { biome: biome === 'random' ? undefined : biome, depth: d })
  : biome.startsWith('boss') ? Gen.boss(seed, { arena: biome.split(':')[1], boss: flag('boss') })
    : Gen.floor(seed, d, { biome: biome === 'random' ? undefined : biome, shop, weapon: flag('weapon'), guardian: flag('guardian') }));
if (flag('stats')) {
  // statistik över n banor (djupet roterar 1-5 om inget djup anges)
  const F = {}, FN = {}, EN = {}, T = {}; let ms = 0;
  for (let k = 0; k < n; k++) {
    const seed = typeof seed0 === 'number' ? seed0 + k : seed0 + '-' + k, t0 = process.hrtime.bigint();
    const lv = makeLevel(seed, pos[2] ? depth : 1 + (k % 5), flag('shop') ? true : k % 2 === 0);
    ms += Number(process.hrtime.bigint() - t0) / 1e6;
    for (const key in lv.features) { F[key] = (F[key] || 0) + (lv.features[key] ? 1 : 0); FN[key] = (FN[key] || 0) + lv.features[key]; }
    for (const r of lv.map) for (const c of r) if ((OLD_EN + NEW_EN).includes(c)) EN[c] = (EN[c] || 0) + 1;
    for (const r of lv.rooms) if (r.arch) T[r.arch] = (T[r.arch] || 0) + 1;
  }
  const tot = Object.values(EN).reduce((a, b) => a + b, 0) || 1;
  console.log(`${biome}: ${n} banor, snitt ${(ms / n).toFixed(1)} ms`);
  console.log('nya saker (andel banor %, snitt antal): ' + Object.keys(FEAT).concat(['beams', 'arenas', 'setpieces', 'setpieces17']).map(k => `${k}=${(100 * (F[k] || 0) / n).toFixed(0)}%/${((FN[k] || 0) / n).toFixed(1)}`).join(' '));
  console.log('fiendemix %: ' + [...OLD_EN + NEW_EN].filter(c => EN[c]).map(c => `${c}=${(100 * EN[c] / tot).toFixed(0)}`).join(' '));
  console.log('rumstyper: ' + Object.entries(T).sort((a, b) => b[1] - a[1]).map(([k, v]) => k + '=' + v).join(' '));
  process.exit(0);
}
if (flag('legend')) console.log(LEGEND.join('\n') + '\n');

for (let k = 0; k < n; k++) {
  const seed = typeof seed0 === 'number' ? seed0 + k : seed0 + (k ? '-' + k : '');
  const t0 = process.hrtime.bigint();
  const lv = makeLevel(seed, depth, !!flag('shop'));
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  const H = lv.map.length, W = lv.map[0].length;
  const types = {}; for (const r of lv.rooms) types[r.type] = (types[r.type] || 0) + 1;
  console.log(`${lv.name} [${lv.biome}${lv.arena ? ':' + lv.arena : ''}] seed ${seed} djup ${lv.depth} ${W}x${H} ${ms.toFixed(1)} ms ambient ${lv.ambient} fog ${lv.fog} tak ${lv.ceil}` +
    (lv.guardian ? ` vaktare ${lv.guardian}` : '') + (lv.boss ? ` boss ${lv.boss}` : '') + (lv.tide ? ` tidvatten ${lv.tide.period} s` : ''));
  console.log('golv: ' + lv.floors.map((f, i) => i + '=' + f).join(' '));
  console.log('områden: ' + Object.entries(types).map(([t, c]) => t + '=' + c).join(' '));
  if (lv.features) console.log('nya saker: ' + Object.entries(lv.features).filter(([, v]) => v).map(([k, v]) => k + '=' + v).join(' '));
  if (lv.boulders && lv.boulders.length) console.log('rullstenar: ' + lv.boulders.map(b => `utlösare ${b.tx},${b.ty} sten ${b.sx},${b.sy}`).join('; '));
  if (lv.beams && lv.beams.length) console.log('ljusschakt: ' + lv.beams.map(b => b.x + ',' + b.y).join(' '));
  if (lv.saws && lv.saws.length) console.log('sågspår: ' + lv.saws.map(s => `${s.x0},${s.y0}-${s.x1},${s.y1}`).join('  '));
  if (lv.teleports && lv.teleports.length) console.log('teleporterpar: ' + lv.teleports.map((t, i) => `${i + 1}: ${t.a.x},${t.a.y} <-> ${t.b.x},${t.b.y}`).join('  '));
  if (lv.carts && lv.carts.length) console.log('vagnbanor: ' + lv.carts.map((c, i) => `${i + 1}: ${c.loop ? 'slinga' : 'fram och tillbaka'} ${c.path.length} rutor från ${c.path[0].x},${c.path[0].y}, fart ${c.speed}, fas ${c.ph}`).join('  ')); // (version 19)
  if (lv.streams && lv.streams.length) console.log('eldfloder: ' + lv.streams.length + ' rutor, ' + lv.streams.slice(0, 12).map(q => `${q.x},${q.y}${q.dx > 0 ? '>' : q.dx < 0 ? '<' : q.dy > 0 ? 'v' : '^'}`).join(' ') + (lv.streams.length > 12 ? ' ...' : '')); // (version 22)
  if (lv.sluices && lv.sluices.length) console.log('slussar: ' + lv.sluices.map(q => `${q.x},${q.y}${q.open ? ' (öppen)' : ''}`).join(' '));
  if (lv.starports && lv.starports.length) console.log('stjärnportpar: ' + lv.starports.map((p, i) => `${i + 1}: ${p[0].x},${p[0].y} <-> ${p[1].x},${p[1].y}`).join('  '));
  if (lv.belts && lv.belts.length) { // rullbanden som raka band: start, riktning och längd
    const at = new Map(lv.belts.map(b => [b.y * W + b.x, b])), runs = [];
    for (const b of lv.belts) { const p = at.get((b.y - b.dy) * W + b.x - b.dx); if (p && p.dx === b.dx && p.dy === b.dy) continue; let len = 0; for (let q = b; q && q.dx === b.dx && q.dy === b.dy; q = at.get((q.y + q.dy) * W + q.x + q.dx)) len++; runs.push(`${b.x},${b.y}${arrow(b)}${len}`); }
    console.log('rullband: ' + runs.length + ' band, ' + lv.belts.length + ' rutor (' + runs.join(' ') + ')');
  }
  if (lv.arenas && lv.arenas.length) console.log('arenor: ' + lv.arenas.map(a => `${a.x0},${a.y0}-${a.x1},${a.y1} (${a.x1 - a.x0 + 1}x${a.y1 - a.y0 + 1}, ${a.waves} vågor, dörrar ${a.doors.map(d => d.x + ',' + d.y).join(' ')})`).join('; '));
  if (lv.shifts && lv.shifts.length) { // version 16: glidande väggar, grupperade per fas
    const ph = {}; for (const sw of lv.shifts) (ph[sw.ph] = ph[sw.ph] || []).push(sw.x + ',' + sw.y);
    console.log('glidande väggar: ' + lv.shifts.length + ' rutor (' + Object.keys(ph).sort((a, b) => a - b).map(k => `fas ${k} s: ${ph[k].join(' ')}`).join('; ') + ')');
  }
  if (lv.winds && lv.winds.length) console.log('vind: ' + lv.winds.length + ' rutor (' + lv.winds.map(w => `${w.x},${w.y}${w.dx > 0 ? '>' : w.dx < 0 ? '<' : w.dy > 0 ? 'v' : '^'}`).join(' ') + ')');
  const errs = Gen.validate(lv);
  if (errs.length) console.log('VALIDERINGSFEL:\n  ' + errs.slice(0, 10).join('\n  '));
  const bossF = lv.floors.findIndex(f => f.startsWith('floor_boss_'));
  const show = flag('sky') ? lv.sky : flag('floor') ? lv.floorMask : flag('mask') ? lv.roomMask : null;
  const mark = {}; // --beams: ljusschakt ~ och rullstenens bana = (utlösaren syns som ¹); --winds: vindens riktning
  if (flag('winds')) for (const w of lv.winds || []) mark[w.y * W + w.x] = w.dx > 0 ? '>' : w.dx < 0 ? '<' : w.dy > 0 ? 'v' : '^';
  if (flag('streams')) for (const q of lv.streams || []) mark[q.y * W + q.x] = q.dx > 0 ? '>' : q.dx < 0 ? '<' : q.dy > 0 ? 'v' : '^'; // (version 22: eldflodernas riktning)
  if (flag('belts')) for (const b of lv.belts || []) mark[b.y * W + b.x] = arrow(b);
  if (flag('arenas')) for (const a of lv.arenas || []) { // arenans kant som + (väggarna runt rummet), dörröppningarna som !
    for (let y = a.y0 - 1; y <= a.y1 + 1; y++) for (let x = a.x0 - 1; x <= a.x1 + 1; x++) if (x < a.x0 || x > a.x1 || y < a.y0 || y > a.y1) mark[y * W + x] = '+';
    for (const d of a.doors) mark[d.y * W + d.x] = '!';
  }
  if (flag('shifts')) for (const sw of lv.shifts || []) mark[sw.y * W + sw.x] = String(Math.floor(sw.ph));
  if (flag('teleports')) (lv.teleports || []).forEach((t, i) => { mark[t.a.y * W + t.a.x] = String(i + 1); mark[t.b.y * W + t.b.x] = String(i + 1); });
  if (flag('beams')) {
    for (const b of lv.beams || []) mark[b.y * W + b.x] = '~';
    for (const b of lv.boulders || []) { const ux = Math.sign(b.sx - b.tx), uy = Math.sign(b.sy - b.ty); for (let k = 1, x = b.tx + ux, y = b.ty + uy; k <= Math.abs(b.sx - b.tx) + Math.abs(b.sy - b.ty); k++, x += ux, y += uy) mark[y * W + x] = '='; }
  }
  for (let y = 0; y < H; y++) {
    let s = '';
    for (let x = 0; x < W; x++) {
      const c = lv.map[y][x];
      if (show) { s += (c >= '0' && c <= '9') || '#%~&=Ø¦Ò¤ÈÌÙĄĆĈĊČĎĹĺĻļĽľŝŞşŠšŢũŪūŵŶŷƊƋƌƓƔƕƟƠơƢƣƤǒǓǔǠǡǢǮǯǰǿȀȁȐȑȒȓȔȕ'.includes(c) ? '#' : (show[y] ? show[y][x] : '?'); continue; }
      if (mark[y * W + x] && (c === '.' || mark[y * W + x] === '~' || mark[y * W + x] === '+' || mark[y * W + x] === '!' || c === 'ń' || c === 'ť' || c === 'Ÿ' || c === 'ƣ' || c === 'ɰ')) { s += mark[y * W + x]; continue; }
      if (c !== '.') { s += c; continue; }
      const fi = lv.floorMask ? +lv.floorMask[y][x] : 0;
      s += fi === bossF ? '`' : '.';
    }
    console.log(s);
  }
  if (flag('rooms')) {
    // per rum: typ, rumstyp, ruta, antal fiender och rekvisita (räknat via rumsmasken när den finns)
    const ENEMY = 'SKVILNORWEQ' + NEW_EN, PROPS = 'ckjquvwyzeiFHJT()[?;/£€©¶®µß÷²³çÿýĖĘĚĞĠŅņŇňŒŦŧŰűŻż' + 'ƎƏƐƗƧƨƩƪ' + 'ǎǐǑǝǞǟ' + 'ǳǴǵǶȄȅȆȇ' + 'țȜȝȞȟ' + 'ȶȸȹȺȻ' + 'ɏɐɑɒɓɔ' + 'ɦɧɨɲɳɴ';
    lv.rooms.forEach((r, i) => {
      let en = 0, pr = 0, items = '';
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const inside = lv.roomMask ? lv.roomMask[y].charCodeAt(x) - 48 === i : (x >= r.x && y >= r.y && x < r.x + r.w && y < r.y + r.h);
        if (!inside) continue;
        const c = lv.map[y][x];
        if (ENEMY.includes(c)) en++; else if (PROPS.includes(c)) pr++;
        if ("ZhaA$CMwy,'}¥ªðþ¼½ĢŊŋŨƂƞƳǫǭǾȏȫɆɟɻ".includes(c) || (Gen.WEAPONS && Gen.WEAPONS[c])) items += c;
      }
      console.log(`  ${String(i).padStart(2)} ${String.fromCharCode(48 + i)} ${r.type.padEnd(9)} ${(r.arch || '').padEnd(12)} ${(r.tag || r.shape || '').padEnd(9)} ${r.x},${r.y} ${r.w}x${r.h}  fiender ${en}  rekvisita ${pr}  ${items}` + (r.guardian ? '  vaktare ' + r.guardian : '') + (r.lock ? '  lås ' + r.lock : ''));
    });
  }
  console.log('');
}
