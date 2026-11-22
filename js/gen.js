'use strict';
// Procedurell bangenerator för KRYPTA (version 16): tjugoen biomer som delar ett rutnäts-API, en flood fill-pass (connectRegions)
// och en gemensam innehållspass (content: rumstyper, rekvisita, föremål, fiendegrupper, vaktarens sal).
//   Gen.floor(seed, depth, opts)  -> banobjekt (kartsträngar + tema) för djup 1-5
//   Gen.boss(seed, opts)          -> bossarena (opts.arena: 'hall' | 'graveyard' | 'cave' | 'forest' | 'swamp' | 'frost' | 'volcano' | 'tomb'
//                                    | 'crystal' | 'sunken' | 'clock' | 'sky' | 'fungus' | 'mirror' | 'library' | 'foundry' | 'cathedral' | 'hive'
//                                    | 'garden' | 'dream',
//                                    opts.boss: vaktar-id)
//   Gen.secret(seed, opts)        -> hemlig skattvåning (opts.biome: utseende, standard dungeon; opts.depth)
//   Gen.maze(seed, opts)          -> en stor labyrint (version 7; opts.biome: utseende, standard dungeon; opts.depth, standard 3)
//   Gen.validate(level)           -> lista med felsträngar (tom = OK)
//   Gen.THEMES                    -> fängelsehålans teman (väggtecken, golv/tak, dimma, namn)
//   Gen.BIOMES                    -> biomer (id, namn, utomhus, vikt, djup)
//   Gen.GUARDIANS                 -> bossar/vaktare (id -> väggtecken, golvtextur, ljus, dekor)
//   Gen.ARCHES                    -> rumstypernas id
//   Gen.WEAPONS                   -> vapentecken -> vapen-id (g shotgun ... å axe, ä flamer, ö launcher, ô knives, û hammer, ï musket,
//                                    À harpoon, Á boomerang, Â prism, Į sawlauncher, į windgun, Ĳ spear, Ŕ sporelauncher,
//                                    ŕ mirrorshield, Ŗ whip, ƀ runebook, Ɓ steamcannon, ƛ censer, Ɲ hivelauncher, Ʊ shears, Ʋ dreamstaff);
//   Gen.ARENAS                    -> arenornas id
// opts för floor: { biome: id, shop: bool, weapon: ett tecken ur WEAPONS (eller vapnets id), theme: id|index (bara dungeon),
//   guardian: 'demon' | 'beast' | 'nightmare' | 'ogre' | 'ghost' | 'frost' | 'flame' | 'pharaoh' | 'crystalqueen' | 'leviathan'
//   | 'clockmaker' | 'thunderbird' | 'mycelmother' | 'mirrorking' | 'librarian' | 'colossus' | 'cardinal' | 'queenbee' | 'gardener' | 'sandman'
//   (annars väljs den ur seeden), v14off / v15off / v16off (stänger av version 14 / 15 och 16 / 16 i de gamla biomerna, se nedan) }
//
// Biomer: dungeon (rum i olika former + korridorer), caves (cellautomat), graveyard (öppet fält med prefabs),
//   forest (brusmask + slingrande stig), courtyard (borggård omgiven av byggnadslängor), swamp (vatten, mossöar, spänger, pålhyddor),
//   frost (fängelsehålans salar och korridorer i frusen sten kring 1-3 snögårdar under himlen, rummen där har tag 'yard'),
//   volcano (samma bygge i obsidian med askfält), tomb (samma bygge i sandsten med ökengårdar, version 7),
//   crystal (grottans bygge i kristall, version 8), sunken (fängelsehålans bygge i ruinmur med översvämmade torg, version 8),
//   clock (fängelsehålans bygge i mässing, inomhus, version 9), sky (fängelsehålans bygge som öar och broar över tomrummet, version 9),
//   fungus (grottans bygge i svampvägg, version 11), mirror (fängelsehålans bygge i marmor med spegelväggar, inomhus, version 11),
//   library (fängelsehålans bygge i träpanel med hyllrader, inomhus, version 13), foundry (fängelsehålans bygge i järnplåt, inomhus, version 13),
//   cathedral (fängelsehålans bygge i katedralsten med ett långhus, inomhus, version 15), hive (fängelsehålans bygge i vax med sexkantiga celler,
//   inomhus, version 15), garden (molnborgens bygge med häckar under himlen, version 16), dream (fängelsehålans bygge i drömvägg med glidande väggar,
//   inomhus, version 16)
// Varje vanlig våning har en vaktares sal (rumstyp 'guardian') med Z i mitten, väggar i vaktarens väggtecken och
//   golv i vaktarens golvtextur. Fält utöver kartan: biome, guardian (vaktar-id), sky (null inomhus, annars '1' öppen
//   himmel / '0' tak per ruta), floors (golvtexturer, [0] = floor, högst 10) + floorMask ('0'-'9' per ruta = index i floors),
//   ceil (tak där sky är '0'), roomMask ('-' utanför rum, annars tecknet 48 + index i rooms), rooms ({x, y, w, h, type,
//   arch, tag?, shape?, guardian?, lock?}; type: start exit normal elite treasure shop shrine secret guardian special vault),
//   features (antal nya saker, se nedan). Rumsformer i fängelsehålan: rect round block L cross pillars (två pelarrader)
//   ring vault (två rum förbundna av en valvbåge); vaktarens sal: hall; frostfästets gårdar: yard
//
// Tecken:
//  1-5 vägg   6 skogsbryn   7 kyrkogårdsmur   8 grottberg   9 timmervägg
//  # demon (blod-/köttegel)  % best (obsidian med lavasprickor)  ~ mardröm (mörkt järn, blå runor)
//  & ogre (timmerpalissad med ben)  = vålnad (blek spökkapellsten)  ¦ frost (isvägg)     (alla sex är väggar)
//  D dörr   G grind   * hemlig vägg   x utgång   P start   S K V I L N O R W fiender   E elitfiende   B boss
//  Z vaktare (våningens miniboss)   Q mimic (ser ut som en kista, är en fiende)
//  h a A $ C föremål (C kortkista), g r m d b s p vapen (se WEAPON_CHARS)   M köpman (blockerar)
//  f eldfat (blockerar, ljuskälla)   t träd, n gravsten (blockerar men är sprites)   o kruka   . golv
//  Rekvisita (sprites), B = blockerar:
//  c kandelaber (ljus)  k kista/likkista (B)  j benhög  q bokhylla (B)  u staty (B)  v bur med skelett (B)
//  w helande brunn (B, högst 1)  y förbannat altare (B, högst 1)  z spikfälla (skadar periodvis, högst 6)
//  e explosiv tunna (B, kan skjutas, 1-4)  i glödande kristall (ljus)  F lysande svamp (ljus)
//  H rustningsställ/vapenställ (B)  J bord (B)  T trälåda (B, går att slå sönder)
// Version 4:
//  0 träskvägg (vass/dött snår, vägg)
//  Nya fiender (gångbara, räknas som fiender): U spindel  X fladdermus  Y helveteshund  ! bombskelett  @ sköldbärare
//    ^ svampman  + levande rustning (vilande, ser ut som ett rustningsställ). Biomer/djup: se BIOME_ENEMIES / NEW_ENEMIES.
//  Farliga golv (gångbara): _ lava  - vatten (saktar)  : is (halt)  " spindelväv (saktar)
//  Interaktiva (blockerar, högst 1 av varje): ( städ/smedja  ) spåaltare  [ fångbur  ? utmaningsaltare  ; offerskål  / spak
//  Grindar och lås: | järngrind (stängd dörr tills spaken / dras)  ] låst dörr (öppnas med nyckeln })  { sprucken vägg
//    (kan sprängas, alternativ ingång till hemliga rum). Allt utom valven (rooms[i].type 'vault', lock 'lever'|'key')
//    och hemliga rum nås med | ] { stängda.
//  Fällor (gångbara): < pilplatta (högst 4, vägg inom 6 rutor i rak linje)  > gasventil (högst 3)
//  Föremål (gångbara): , granatknippe (1-5)  ' skattkarta (0-1)  } nyckel
//  level.features: antal { anvil, fortune, prisoner, challenge, offering, lever, locked, cracked, arrows, gas, lava, water, ice, webs,
//    alchemist, priest, petcage, potions, icicles }
//  Specialrum utan fiender: type 'special' (arch fortune | challenge | offering | smithy | alchemy | chapel2) och type 'vault'
//    (arch levervault | lockedvault)
// Version 5 (enskilda tecken utanför ASCII, JS-strängarna är UTF-8):
//  Ø frusen sten (vägg, frostfästet)   ¦ frostväktarens isvägg (vägg, vaktar-/bosstema 'frost')
//  Vapen (föremål): å yxa  ä eldkastare  ö granatkastare (se WEAPONS)
//  Nya fiender (gångbara): Å ghoul  Ä kultist  Ö gargoyle (vilande staty; ersätter ibland en staty u)  É isvarg  Ü frostirrbloss
//  NPC:er (blockerar, högst 1 av varje, fri framsida, aldrig i en flaskhals): £ alkemist (rumstyp alchemy)  € präst (rumstyp chapel2)
//    (hamnar annars i butiken eller ett annat specialrum)   © husdjursbur (blockerar, högst 1, i ett hörn av ett stridsrum)
//  ¥ dryck (föremål, 0-2: fler i alkemistens rum och valv)   Ç istapp (gångbar fara vid rummens kanter, högst 8, aldrig vid P/x/dörrar)
//  Biom frost (FROSTFÄSTET): frusna salar (Ø) och korridorer kring snötäckta gårdar under himlen (rummen med tag 'yard');
//    golv floor_frost_stone inomhus och floor_snow på gårdarna, isfält (:) och istappar (Ç). Rumstyper: throne, frozenlake,
//    barracks, crystalhall. Bossarena 'frost': ishall med en frusen sjö i mitten och pelare av Ø.
// Version 6 (enskilda tecken utanför ASCII):
//  Ò obsidian (vägg, vulkanen)   ¤ flamväktarens glödande sten (vägg, vaktar-/bosstema 'flame')
//  Vapen (föremål, ett per våning via opts.weapon): é spikpistol (nailgun)  ü stav (staff)  ñ båge (bow)
//  Nya fiender (gångbara, räknas som fiender i alla rumsregler):
//    Ñ nekromantiker (alla biomer, djup 3+, högst 2)   Æ eldelementar (vulkanen vanlig, grottor/fängelsehåla sällsynt; djup 2+)
//    Þ lavamask (bara vulkanen, står alltid intill lava _)   Ð dödsriddare (fängelsehåla, kyrkogård, borggård, vulkan; djup 3+, högst 2)
//    Ý banshee (kyrkogård, träsk, frostfästet; djup 2+). Utom Æ i vulkanen byts de in mot redan utplacerade fiender (eget slumpflöde).
//  Rekvisita (blockerar som rekvisita, aldrig i dörröppningar/flaskhalsar, fri framsida):
//    ¶ lägereld/viloplats (högst 1, ~25 % av våningarna, i ett eget litet rum utan fiender: type 'special', arch 'camp')
//    ® anslagstavla med uppdrag (högst 1, ~30 %, i startrummet eller ett rum som gränsar till det)
//    µ gifttunna  ß frosttunna (kan skjutas som e; 0-3 totalt, fler µ i vulkanen/träsket och fler ß i frostfästet)
//    ÷ hemlig trappa (högst 1, ~15 %, bara i ett hemligt rum bakom * eller {; spelet skickar spelaren till en hemlig våning)
//  Föremål (gångbara): ª runsten (0-1, ~35 %, helst i valv/skattrum/hemliga rum)  ð kött (0-2, i lägret, kasernen eller smedjehallen)
//  Fällor (gångbara, aldrig på/intill P och x, aldrig intill dörrar):
//    ° eldstråle (högst 4; vulkanen och fängelsehålan, i korridorer och längs rummens kanter)
//    ¬ smulande golv (högst 8; i korridorer, på broar och spänger. Rasar till ett hål som blockerar, så det ligger bara där det finns
//      en annan väg: med ¬ som vägg nås fortfarande allt, validate räknar ¬ som lava)
//    ± pendelblad (högst 3, bara i en korridor som är 1 ruta bred)
//    ¨ tryckplatta (högst 2, i rummet framför en hemlig vägg * eller sprucken vägg {; spelet öppnar den när man kliver på plattan)
//  Biom volcano (VULKANEN): obsidiansalar (Ò) och korridorer med lavafloder (_) som korsas av broar, och öppna askfält under en röd
//    himmel (rummen med tag 'yard', sky '1'); golv floor_basalt inomhus och floor_ash på fälten (floors [0] basalt, [1] vaktarens,
//    [2] aska), tak floor_basalt. Rumstyper: forge (smedjehall: H J T, ibland städ, eldgropar f), lavalake (lavasjö med en bro),
//    ashfield (askfält med lavaflod), magmachamber (kristaller och lavagölar). Vaktaren är flamväktaren (flame) varannan gång.
//    Bossarena 'volcano': obsidianhall med en vallgrav av lava runt mitten, fyra broar och pelare av Ò.
//  Vaktar-/bosstema 'flame': väggar ¤, golv floor_boss_volcano, ljus f, dekor u och i.
//  level.features utökas med { campfire, questboard, runes, meat, firejets, crumble, pendulums, plates, secretstairs, poisonbarrels, frostbarrels }
//  Gen.secret(seed, opts) -> hemlig skattvåning (samma banobjekt som floor: map, biome, sky, floors, floorMask, rooms, roomMask,
//    features, name ...): 2-4 rum i rad med kistor C, guld $, en runsten ª, 1-3 eliter E, start P och utgång x;
//    opts.biome väljer utseendet (standard dungeon), opts.depth (standard 1)
// Version 7 (enskilda tecken utanför ASCII):
//  È sandsten (vägg, gravkammaren)   Ì hieroglyfvägg (vägg; sträckor längs korridorerna och runt specialrum, skattrum, valv och
//    gravkamrar; aldrig vid den hemliga/spruckna väggen eller i kanten)   Ù faraonens vägg (vaktar-/bosstema 'pharaoh')
//  Vapen (föremål, ett per våning via opts.weapon): ô kastknivar (knives)  û hammare (hammer)  ï musköt (musket)
//  Nya fiender (gångbara, räknas som fiender i alla rumsregler; utanför gravkammaren byts de in mot redan utplacerade fiender, så
//    gruppernas storlek står kvar):
//    Ã mumie (gravkammaren vanlig, även i gravkamrarna med sarkofager; kyrkogården sällsynt ~25 %, 1-2; djup 1+)
//    Õ skarabé (gravkammaren ~70 %, grottorna ~30 %; djup 1+; alltid en hel grupp om 3-5 i ett stridsrum, ibland två grupper)
//    Ê schakalkrigare (gravkammaren, borggården ~45 % av banorna där; djup 2+)
//    Î tjuv (alla biomer, djup 2+, ~20 %, högst 1; helst i ett rum med guld)   Ô dubbelgångare (alla biomer, djup 3+, ~20 %, högst 1)
//  Fällor och farliga golv (gångbara, aldrig på/intill P och x, aldrig intill dörrar):
//    ¯ kvicksand (bara gravkammaren och tempelhallen: fläckar om 2-8 rutor i sandgångarna, på gårdarna och i korridorerna, högst 32
//      rutor; den är aldrig enda vägen: med ¯ som vägg nås fortfarande allt, validate räknar ¯ som lava)
//    ¹ rullstensutlösare (högst 1; gravkammaren ~40 %, fängelsehålan ~15 %): i ena änden av en rak korridor om minst 6 rutor utan
//      hinder, dörrar eller fällor. level.boulders = [{ tx, ty, sx, sy }]: utlösarens ruta och rullstenens startruta (andra änden);
//      spelet rullar stenen från (sx, sy) mot utlösaren när någon kliver på den
//  Rekvisita (blockerar som rekvisita, fri framsida, aldrig i dörröppningar/flaskhalsar, stänger aldrig in en kruka/spikfälla):
//    ² sarkofag (gravkammaren 2-5, kyrkogårdens och fängelsehålans kryptor 0-2, faraonens sal; högst 5)
//    ³ larmklocka (högst 1, ~25 % av banorna på djup 2+, mot en vägg i ett stridsrum med fritt golv framför: fienderna når den)
//  NPC:er (blockerar, högst 1 av varje, fri framsida):
//    ç spelare/hasardspelare (~20 %, i ett rum utan fiender: butiken, ett specialrum, lägret, helgedomen eller skattrummet)
//    ÿ bankir (~15 %, aldrig på djup 1; helst i butiken, annars ett rum utan fiender eller startrummet)
//    ý vandrare (~25 %, i en korridornisch/återvändsgränd eller ett rum utan fiender)
//  Föremål (gångbara): þ krönikesida (0-1, ~40 %, helst i hemliga rum, valv och skattrum)   ¼ lampolja/batteri (0-2, fler djupt ner och i
//    mörka biomer; labyrinten 2-4)   ½ kaststenar (0-2 små högar)
//  Ljusschakt: level.beams = [{ x, y }] (högst 6 rutor; gravkammaren ~85 %, borggården ~25 %, fängelsehålan ~20 %): gångbara rutor i
//    rum inomhus (sky '0') där solljus faller genom ett hål i taket. Alla vanliga våningar har level.boulders och level.beams (tomma listor
//    när det saknas).
//  level.features utökas med { sarcophagi, quicksand, boulders, bells, gambler, banker, wanderer, pages, batteries, stones, beams }
//    (beams = antal ljusschaktsrutor, övriga = antal tecken på kartan)
//  Biom tomb (GRAVKAMMAREN; vikt 12, djup 1-5, i ett eget slag så att övriga seeds behåller sin biom från version 6): fängelsehålans
//    bygge med sandstenssalar (È, hieroglyfer Ì), sandfyllda korridorer och 1-3 öppna gårdar under ökensolen (rummen med tag 'yard',
//    sky '1'). floors [0] floor_sand (korridorer, gårdar, vanliga salar), [1] vaktarens golv; floor_gold_tiles i gravkamrarna och
//    skattkamrarna; tak floor_sand; varm sanddimma. Namn: GRAVKAMMAREN, DEN SJUNKNA GRAVEN, FARAONENS VALV, SANDHALLARNA,
//    DE GYLLENE KAMRARNA, SKARABÉGROTTAN. Rumstyper: burialchamber (gravkammare: sarkofager ², guldhögar $, statyer u, ljus),
//    pillarhall (rader av sandstenspelare È), treasury (guld, krukor, statyer, en förbannad kista C), sandtunnel (sandgång med
//    kvicksandsfläckar), sandcourt (gårdarna: obelisker u, palmer t, ben). Vaktaren är faraonen varannan gång (utan opts.guardian).
//    Bossarena 'tomb' (tempelhallen): raka väggar av È, pelarrader längs väggarna och speglade pelare, en sänkt sandgrop i mitten
//    omgiven av en ring av kvicksand ¯ med fyra passager (norr, söder, väster, öster); floors [0] floor_gold_tiles, [1] floor_sand,
//    tak floor_sand, inomhus; samma P/B/G/x-kontrakt som de andra arenorna (fri 9x9-mitt utan hinder; ¯ är gångbart).
//  Vaktar-/bosstema 'pharaoh': väggar Ù, golv floor_boss_pharaoh, ljus c, dekor u och sarkofager ² (högst 3 i en arena).
//  Gen.secret har även utseendet tomb (väggar Ì, guldplattor och sand).
//  Gen.maze(seed, opts) -> en stor labyrint (samma banobjekt: map, biome (opts.biome, standard dungeon), sky (utomhusbiomer: '1'
//    överallt, annars null), floors ([0] gångarna, [1] rummen), floorMask, rooms, roomMask, features, name (t.ex. LABYRINTEN),
//    maze: true, boulders [], beams []): 46x46 rutor, 15x15 celler, perfekt labyrint (djupet först) med ~10 % extra öppningar
//    (slingor), gångar 1-2 breda (breda zoner efter brus), 2-4 små rum (5x5) med kistor C, guld och föremål, P i ett startrum i
//    ett hörn, x i änden av den längsta vägen, 8-14 utspridda fiender långt från P, 2-4 lampoljor ¼ (helst i återvändsgränder),
//    en krönikesida þ, hälsa, ammo och guld
// Version 8 (enskilda tecken utanför ASCII; allt nytt i alla biomer har egna slumpflöden ur gaffeln 'v8'):
//  Väggar: Ą kristallvägg  Ć kristallåder (lyser; glesa sträckor i kristallgrottornas väggar, aldrig vid den hemliga/spruckna väggen)
//    Ĉ kristalldrottningens vägg (vaktar-/bosstema 'crystalqueen')  Ċ sjunken ruinmur  Č korallvägg (växer där vattnet når muren och i
//    glesa fläckar)  Ď leviatans vägg (vaktar-/bosstema 'leviathan')
//  Vapen (föremål, ett per våning via opts.weapon): À harpun (harpoon)  Á bumerang (boomerang)  Â prisma (prism)
//  Nya fiender (gångbara, räknas som fiender i alla rumsregler):
//    Ë kristallgolem och Í skärvirrbloss (kristallgrottornas egna, djup 1+)   Ï drunknad sjöman och Û krabba (sjunkna stadens egna,
//    djup 1+)   Ú siren (sjunkna staden, djup 2+)   Ó ål (sjunkna staden ~70 % av banorna, 1-3: står ALLTID på en ruta med djupt vatten
//    (golv floor_deepwater, minst en vattenruta intill), i ett stridsrum; en fiende i samma rum flyttas ut i vattnet så att gruppernas
//    storlek står kvar)   Ā skuggjägare (alla biomer, djup 2+, ~20 %, högst 1)   Ă häxa (alla biomer, djup 3+, ~20 %, högst 1);
//    Ā och Ă byts in mot redan utplacerade fiender i stridsrummen
//  Farliga golv (gångbara, aldrig på/intill P och x, aldrig enda vägen: med dem som vägg nås fortfarande allt, validate räknar dem som lava;
//    undantag: vattenskatter, se nedan):
//    Đ djupt vatten (simning, luftmätare; golv floor_deepwater): sjunkna staden: bassänger (cisterner, torg), kanaler tvärs genom salar och
//      i breda korridorer, minst 12 rutor per bana; även bassängen i leviatans sal (alla biomer) och arenan 'sunken'
//    Ē kristallspikar (kristallgrottorna: 2-4 fläckar om 2-6 rutor, högst 24 rutor, aldrig vid dörrar)
//    Ĕ tidvattenruta (sjunkna staden: grunt vatten längs stränderna, golv floor_shallow, högst 48 rutor; blir periodvis djupt:
//      level.tide = { period: s } med period 24-40 sekunder i sjunkna staden och arenan 'sunken', annars level.tide = null)
//  Rekvisita (blockerar, aldrig i dörröppningar/flaskhalsar):
//    Ė brytande kristall (kristallgrottorna 1-4, högst 4, fritt i stora rum (minst 36 rutor); skott som träffar den delas i tre)
//    Ę glödkristall (ljuskälla, färgad; ersätter eldfaten f i kristallgrottorna utanför vaktarens sal, även i geoder och prismasalar;
//      kristalldrottningens ljus). Kandelabrarna c blir glödande kristaller i i kristallgrottorna.
//    Ě vrakkista (sjunkna staden 1-3, högst 3, fri framsida; öppnas med E, kan vara mimic)
//  NPC/interaktiva (blockerar, högst 1 av varje, fri framsida, nås med grindarna stängda):
//    Ğ kartografen (~15 %, i ett rum utan fiender eller startrummet)   Ġ talangaltare (~25 %, i ett rum utan fiender, helgedomen eller
//    startrummet)
//  Föremål (gångbara): Ģ kunskapsbok (0-2, ~35 % av banorna, helst i hemliga rum, valv och skattrum)
//  Luftbubblor: Ĝ (sjunkna staden: i de flesta bassänger/kanaler om minst 8 rutor, högst 4 per bana; validate tillåter 6): en ruta i
//    vattnet (räknas som djupt vatten, golv floor_deepwater, minst en vattenruta intill) som fyller luften
//  Vattenskatt (sjunkna staden, ~60 % av banorna med en tillräckligt stor bassäng): en holme i en bassäng (alla fyra grannar och minst sex
//    av de åtta runt om djupt vatten) med en vrakkista Ě (eller guld $) som bara nås genom att simma; det är den enda saken som får nås
//    bara över vatten (validate godtar Ě och $ h a Ģ ¥ som nås simmande, med grindarna stängda och utan lava/spikar)
//  Biom crystal (KRISTALLGROTTORNA; inomhus, vikt 12, djup 1-5, i ett eget slag så att övriga seeds behåller sin biom): grottans bygge
//    (cellautomat, vaktarens lya) i kristallvägg Ą med ådror Ć; floors [0] floor_crystal, [1] floor_cave (fläckar), [2] vaktarens;
//    tak ceil_cave; kall blåviolett dimma, lågt ljus. Namn: KRISTALLGROTTORNA, GLITTERSALEN, PRISMAGRUVAN, AMETISTDJUPET,
//    DE SJUNGANDE KRISTALLERNA, SKÄRVGÅNGARNA. Rumstyper: geode (kristallkluster, glödkristall), prismhall (stor sal, brytande
//    kristaller), shardfield (skärvfält med spikfläckar) och grottans grotto, mushroom, boneden, camp. Vaktaren är kristalldrottningen
//    varannan gång (utan opts.guardian).
//  Biom sunken (DEN SJUNKNA STADEN; utomhus, vikt 12, djup 1-5, eget slag): fängelsehålans bygge (salar + korridorer) i ruinmur Ċ med
//    korall Č och 1-3 översvämmade torg under himlen (rummen med tag 'yard'); floors [0] floor_sunken_tiles, [1] vaktarens,
//    sedan floor_deepwater (under Đ Ĝ Ó) och floor_shallow (under Ĕ); tak floor_stone; grönblå dimma. Namn: DEN SJUNKNA STADEN,
//    DE DRUNKNADES GATOR, KORALLTEMPLET, TIDVATTENSHAMNEN, DEN ÖVERSVÄMMADE KATEDRALEN, DJUPETS KVARTER. Rumstyper: cistern (bassäng
//    med en bro), drownedhall (pelarsal med kanal), wreckhall (vraksal), coralgrotto (korall, lysande alger F, göl), plaza (torgen:
//    bassäng eller kanal, brutna statyer). Vaktaren är leviatan varannan gång (utan opts.guardian).
//  Vaktar-/bosstema 'crystalqueen': väggar Ĉ, golv floor_boss_crystalqueen, ljus Ę, dekor i och u.
//  Vaktar-/bosstema 'leviathan': väggar Ď, golv floor_boss_leviathan, ljus c, dekor j och u; i alla biomer har leviatans sal en bassäng
//    Đ (5-13 rutor, golv floor_deepwater) minst tre rutor från Z.
//  Bossarena 'crystal' (KRISTALLTRONEN): grottarenans form i Ą (berget växer in, kristallpelare i speglade par), en ring av 6-8 brytande
//    kristaller Ė runt den fria mitten, glödkristaller Ę i stället för eldfat, ådror Ć; floors [0] floor_crystal, [1] floor_cave; inomhus.
//  Bossarena 'sunken' (LEVIATANS BASSÄNG): raka ruinmurar Ċ, en stor bassäng Đ (ojämn ellips, x ca 6-18, y 8-20) som fyller den fria
//    mitten och når fram till bossen B (vattnet ligger precis söder om B), gångar runt om (norr, väster, öster, söder) med pelare Ċ,
//    korall Č och statyer, tidvatten Ĕ längs stranden, 2-3 luftbubblor Ĝ; floors [0] floor_sunken_tiles, [1] floor_deepwater,
//    [2] floor_shallow; utomhus; level.tide. Båda arenorna har samma P/B/G/x-kontrakt och fria 9x9-mitt (inga hinder; vatten är gångbart).
//  level.features utökas med { deepwater, crystalspikes, tide, breakcrystals, glowcrystals, wrecks, bubbles, cartographer, talentaltar,
//    books, stalker, witch, eels } (antal tecken på kartan)
//  Gen.secret och Gen.maze har även utseendena crystal och sunken.
//  Frön: vanliga våningar med en gammal biom ger samma karta som i version 7 med de nya sakerna ovanpå (underkänns en bana med dem tas de
//    bort igen och banan blir exakt som i version 7); utan opts.biome ändras bara banorna som slår de nya biomerna.
// Version 9 (enskilda tecken utanför ASCII; allt nytt har egna slumpflöden ur gaffeln 'v9', content9 körs sist av allt):
//  Väggar: Ĺ mässingsvägg  ĺ kuggvägg (glesa sträckor i klocktornets synliga väggar, aldrig vid den hemliga/spruckna väggen)
//    Ļ urmakarens vägg (vaktar-/bosstema 'clockmaker')  ļ molnsten  Ľ stormmur (molnborgens kant och en del av de låga murarna)
//    ľ stormfågelns vägg (vaktar-/bosstema 'thunderbird')
//  Vapen (föremål, ett per våning via opts.weapon): Į sågbladskastare (sawlauncher)  į vindbössa (windgun)  Ĳ spjut (spear)
//  Nya fiender (gångbara, räknas som fiender i alla rumsregler):
//    ĳ urverkssoldat (klocktornet, djup 1+)  ĵ tidsväktare (klocktornet, djup 2+)  Ĵ kuggspindel (klocktornet ~80 % av banorna: alltid en
//    hel grupp om 3-5 i ett stridsrum, djup 3+ ibland två grupper; byts in mot en grupp så att storleken står kvar)
//    Ķ harpya (molnborgen, djup 1+)  ķ stormkallare (molnborgen, djup 2+)  ĸ molnjätte (molnborgen, djup 3+, ~55 %, 1-2, högst 2; byts in i
//    stridsrum om minst 30 rutor)
//  Faror (gångbara, aldrig på/intill P och x, aldrig intill dörrar; validate räknar Ŀ och ŀ som lava: aldrig enda vägen):
//    Ŀ sågspår (klocktornet: 2-5 raka spår om 3-7 rutor, först längs väggarna i strids- och skattrummen och i breda korridorer, annars
//      tvärs över rummen; ~97 % av banorna har minst ett). level.saws = [{ x0, y0, x1, y1 }]: ett spår per post (raka, 3-7 rutor, ändarna
//      ingår); varje Ŀ på kartan tillhör exakt ett spår. Alla banor har level.saws (tom lista när det saknas)
//    ŀ tidsbubbla (klocktornet 1-3, högst 3: bubblans mittruta, radie ~2, i stora strids-/skattrum, minst 4 från P, 6 från varandra; alltid i
//      ett rum)
//    Ń tomrum/avgrund (molnborgen: allt utom öarna, broarna, murarna och kanten; golv floor_void). Ń blockerar i nåbarheten: allt nås till
//      fots utan att gå på tomrummet; aldrig intill P och x (validate räknar Ń som fara)
//    ń vindruta (molnborgen: 2-4 vindbyar om 2-4 rutor i rad på broarna; golv floor_wind). level.winds = [{ x, y, dx, dy }] (en post per ń,
//      (dx, dy) en av (1,0) (-1,0) (0,1) (0,-1)): vinden blåser längs bron, rutan i vindens riktning är aldrig tomrum eller hinder.
//      Alla banor har level.winds (tom lista när det saknas)
//  Rekvisita (blockerar, aldrig i dörröppningar/flaskhalsar):
//    Ņ urverk (dekor och ljuskälla: ersätter ungefär vartannat eldfat f i klocktornet utom i vaktarens sal, 2-3 i urverkshallar, ett i
//      pendelsalar och verkstäder; urmakarens dekor)   ņ blixtstång (molnborgen 2-4 vid öarnas kanter + stormspirornas; stormfågelns dekor)
//    Ň klockspel (klocktornet ~60 %, högst 1: i ett rum utan fiender, annars startrummet eller ett stridsrum; fri framsida, nås med
//      grindarna stängda)   ň molnkista (molnborgen 1-3, högst 3: skattrummen först; fri framsida mot öns kant)
//  Föremål (gångbara, alla biomer, med ångra-lista): Ŋ kugghjul (~30 % av banorna, klocktornet ~50 %, 1-3, högst 3; helst i hemliga rum,
//    valv och skattrum)   ŋ fjäder (~15 %, molnborgen ~25 %, högst 1; helst i hemliga rum, valv och skattrum)
//  Biom clock (KLOCKTORNET; inomhus, vikt 12, djup 1-5, i ett eget slag ur gaffeln 'v9' så att övriga seeds behåller sin biom):
//    fängelsehålans bygge (salar + korridorer) i mässingsvägg Ĺ med kuggväggar ĺ; floors [0] floor_brass, [1] vaktarens (verkstäder,
//    förråd och bibliotek får trägolv); tak floor_brass; varm mässingsdimma. Namn: KLOCKTORNET, URVERKET, PENDELSALEN, KUGGARNAS GÅNGAR,
//    TIDENS VALV, URMAKARENS VERKSTAD. Rumstyper: gearworks (urverkshall), pendulumhall (pendelsal: pelarrader av Ĺ), workshop
//    (urmakarens verkstad: bord, vapenställ, lådor) och storeroom, armory, library, prison, crypt. Vaktaren är urmakaren varannan gång.
//  Biom sky (MOLNBORGEN; utomhus, sky '1' överallt, vikt 12, djup 1-5, eget slag): fängelsehålans bygge där salarna är öar (golv
//    floor_cloud; 1-3 stora öar med tag 'yard') och korridorerna broar (1-2 breda). Alla väggar blir tomrum Ń utom: kanten (stormmur Ľ),
//    karmarna runt grindar, låsta dörrar och hemliga/spruckna väggar, murarna runt valven och de hemliga rummen (små stenhus), 3x3 runt P
//    och x, fristående pelare (väggklungor om högst 4 rutor) och glesa låga murar om 1-3 rutor vid öarnas kanter (ļ eller Ľ). Vanliga
//    dörrar D blir golv. Öarnas hörn faller bort (hörnrutor med två sidor mot tomrummet, localOK). Vaktarens sal: ungefär hälften av
//    väggringen står kvar och rutor längs salens kanter blir tomrum, men aldrig i den fria mitten (5x5 runt Z) eller vid ingångarna.
//    floors [0] floor_cloud, [1] vaktarens, sedan floor_void och floor_wind; ljus blåvit dimma. Namn: MOLNBORGEN, STORMENS TINNAR,
//    DE SVÄVANDE ÖARNA, VINDARNAS RIKE, ÅSKANS TRAPPOR, HIMMELSBORGEN. Rumstyper: cloudisle (molnö), harpynest (harpyrede), stormspire
//    (stormspira med blixtstång), storeroom, statues; de stora öarna cloudcourt (molngård) och statues. Vaktaren är stormfågeln varannan gång.
//  Vaktar-/bosstema 'clockmaker': väggar Ļ, golv floor_boss_clockmaker, ljus f, dekor Ņ och u.
//  Vaktar-/bosstema 'thunderbird': väggar ľ, golv floor_boss_thunderbird, ljus f, dekor ņ och u (i molnborgen med tomrum runt kanterna).
//  Bossarena 'clock' (URVERKSHALLEN): raka mässingsväggar Ĺ med kuggväggar ĺ; sågspår (level.saws, 3-7 rutor) längs väster- och östväggen
//    (två par), längs södra väggen på var sida om P och ibland längs norra väggen en bit från bossen; två tidsbubblor ŀ speglade på var sin
//    sida om den fria mitten (x 4-6 resp. 18-20, y 12-16); mässingspelare, urverk Ņ och kuggväggar i speglade par; floors [0] floor_brass; inomhus.
//  Bossarena 'sky' (STORMFÅGELNS NÄSTE): allt inne i arenan är tomrum Ń utom en stor ö (ojämn ellips kring mitten, x ca 5-19, y 9-20) som
//    täcker den fria mitten, en terrass vid bossen och grinden (x 9-15, y 4-9), startön i söder (x 9-15, y 23-25) via en bro (1-2 bred)
//    och 2-3 speglade par små öar (nordväst/nordost, sydväst/sydost, väster/öster) med broar (1-2 breda); vindbyar ń (level.winds) på ett
//    par broar som blåser in mot den stora ön, blixtstänger ņ vid kanten, eldfat runt den stora ön; kanten stormmur Ľ; floors [0]
//    floor_cloud, [1] floor_void, [2] floor_wind; utomhus. Båda arenorna har samma P/B/G/x-kontrakt och fria 9x9-mitt som de andra.
//  level.features utökas med { saws, timebubbles, void, winds, clockworks, lightningrods, chimes, cloudchests, gears, feathers, gearspiders,
//    cloudgiants } (antal tecken på kartan: Ŀ ŀ Ń ń Ņ ņ Ň ň Ŋ ŋ Ĵ ĸ). Alla banor (även arenor, hemliga våningar och labyrinter) har
//    level.saws och level.winds.
//  Gen.secret och Gen.maze har även utseendena clock och sky (molnlabyrinten: murar av molnsten under öppen himmel, inget tomrum).
//  Frön: vanliga våningar med en gammal biom ger samma karta som i version 8 med kugghjul och fjädrar ovanpå (underkänns en bana med dem
//    tas de bort igen och banan blir exakt som i version 8); utan opts.biome ändras bara banorna som slår klocktornet eller molnborgen.
// Version 10 – "Nya invånare" (enskilda tecken utanför ASCII; allt nytt har egna slumpflöden ur gaffeln 'v10', content10 körs sist av allt):
//  Nya fiender i de gamla biomerna (gångbara, räknas som fiender i alla rumsregler). De byts in mot redan utplacerade fiender i stridsrummen
//    (samma ruta i samma grupp, aldrig i spindelboet, aldrig E/Q/Z/vilande statyer): gruppernas storlek, antal fiender och avstånd till P
//    står kvar. Varje sort är infödd i en biom (~50-55 % av banorna där på tillåtna djup, några per bana) och sällsynt (~8 %, en, rotvättar
//    en grupp om 2) i en närliggande biom; se FOES10:
//    Ō fångvaktare (jailer): kryptan/fängelsehålan (dungeon), djup 1+, 1-3, högst 4; sällsynt på borggården
//    ō grävare (burrower): grottorna (caves), djup 2+, 1-3, högst 4, aldrig i/intill vatten (ingen av de fyra grannarna är - eller djupt
//      vatten); sällsynt på kyrkogården
//    Ŏ likgrävare (gravedigger): kyrkogården (graveyard), djup 1+, 1-2, högst 2; sällsynt i kryptan
//    ŏ rotvätte (rootling): skogen (forest), djup 1+, alltid en hel grupp om 2-3 i samma stridsrum, högst 3; sällsynt i träsket
//    Ő armborstskytt (crossbowman): borggården (courtyard), djup 1+, 1-3, högst 4; helst i rum med skydd (lådor T, tunnor, bord, ställ,
//      statyer, fristående pelare) och på en ruta intill skyddet; sällsynt i kryptan
//    ő paddjätte (toad): träsket (swamp), djup 2+, 1-2, högst 2; helst nära vatten -; sällsynt i skogen
//  Rekvisita (blockerar, fri framsida, nås med grindarna stängda, aldrig i dörröppningar/flaskhalsar):
//    Œ legendaltaret (legendaltar; use: byter själar/guld mot att ett vapen blir legendariskt): högst 1, ~12 % av de vanliga banorna på
//      djup 2+ (alla biomer), i ett lugnt rum (helgedomen, skattrummet eller ett specialrum utom utmaningen; annars startrummet), aldrig i ett
//      stridsrum, vaktarens sal, en bossarena, en hemlig våning eller en labyrint
//  level.features utökas med { jailers, burrowers, gravediggers, rootlings, crossbowmen, toads, legendaltar } (antal tecken: Ō ō Ŏ ŏ Ő ő Œ)
//  Frön: alla vanliga våningar ger samma karta som i version 9 (samma biom, rum, golv, himmel, sågspår, vind ...) med de nya fienderna
//    inbytta och legendaltaret ovanpå; underkänns en bana med dem tas de bort igen (opts.v10.undo) och banan blir exakt som i version 9.
//    Arenor, hemliga våningar och labyrinter är oförändrade.
// Version 11 – "Svampriket och Spegelpalatset" (enskilda tecken utanför ASCII; allt nytt har egna slumpflöden ur gaffeln 'v11', content11
//   körs sist av allt):
//  Väggar: ŝ svampvägg (mycel; svamprikets väggar)  Ş glödande svamphatt (glesa sträckor om 1-3 rutor i de synliga svampväggarna, aldrig vid den
//    hemliga/spruckna väggen; även fristående stjälkar i jättesvampssalarna)  ş mycelmoderns vägg (vaktar-/bosstema 'mycelmother')
//    Š marmor (spegelpalatsets väggar)  š spegelvägg (studsar skott; hela väggsegment i salarna, se nedan)  Ţ spegelkungens vägg (vaktar-/bosstema
//    'mirrorking')
//  Vapen (föremål, ett per våning via opts.weapon): Ŕ sporkastare (sporelauncher)  ŕ spegelsköld (mirrorshield)  Ŗ piska (whip)
//  Nya fiender (gångbara, räknas som fiender i alla rumsregler, alltid i stridsrum):
//    ř svampshaman (myconid; svamprikets egen, djup 2+)  ŗ sporling (svampriket ~85 % av banorna: alltid en hel grupp om 3-5 i ett stridsrum,
//    djup 3+ ibland två grupper; byts in mot gruppens fiender)  Ř mycelbest (mycelbrute; svampriket, djup 2+, ~55 %, 1-2, högst 2; byts in i
//    stridsrum om minst 30 gångbara rutor)
//    Ś spegelriddare (mirrorknight; spegelpalatsets egen, djup 1+)  ś illusionist (spegelpalatset, djup 2+, ~55 %, 1-2, högst 2; byts in)
//    Ŝ glasskärva (shardling; spegelpalatset ~75 %: alltid en hel grupp om 2-4 i ett stridsrum, djup 3+ ibland två grupper)
//  Golvrutor (gångbara, aldrig på/intill P och x, aldrig i en dörröppning; validate räknar dem som lava: med dem som vägg nås allt ändå):
//    ţ studsplatta (svampriket 1-4 per bana, högst 4: i strids- och skattrummen (annars startrummet/helgedomen), på öppet golv, aldrig intill en
//      dörr (de åtta grannarna), en per rum först)
//    Ť sporpöl (svampriket: 2-4 fläckar om 2-6 rutor i strids- och skattrummen, högst 24 rutor; aldrig intill en dörr)
//    ť teleporter (spegelpalatset: 1-3 par per bana, varje par i två olika rum (ett rum har högst en teleporter), aldrig intill en dörr,
//      minst 2 rutor från P och x, minst två fria grannar). level.teleports = [{ a: { x, y }, b: { x, y } }]: varje ť på kartan ingår i exakt ett
//      par. Alla banor (även arenor, hemliga våningar och labyrinter) har level.teleports (tom lista när det saknas)
//  Rekvisita (blockerar, aldrig i dörröppningar/flaskhalsar): Ŧ glödsvamp (ljuskälla; ersätter alla eldfat f i svampriket utom i vaktarens
//    sal (kandelabrarna c blir lysande svamp F), 1-2 klungor i sporgrottorna, en i mycelnästena; mycelmoderns ljus)
//    ŧ spegelstaty (dekor; spegelsalar 1-2, balsalar 0-1, gallerier 1 och 1-3 till i andra rum; spegelkungens dekor)
//  Föremål (gångbara, alla biomer, med ångra-lista): Ũ sporsäck (ammo till sporkastaren; ~25 % av banorna, svampriket ~45 %, 1-2, högst 2; helst
//    i hemliga rum, valv och skattrum; aldrig i arenor, hemliga våningar eller labyrinter)
//  Biom fungus (SVAMPRIKET; inomhus, vikt 12, djup 1-5, i ett eget slag ur gaffeln 'v11' så att övriga seeds behåller sin biom): grottans bygge
//    (cellautomat, vaktarens lya) i svampvägg ŝ med svamphattar Ş; floors [0] floor_moss, [1] floor_cave (fläckar), [2] vaktarens; tak ceil_cave;
//    grön-lila sporrök (grönast, lila skimmer). Namn: SVAMPRIKET, MYCELDJUPET, SPORGROTTORNA, DE GLÖDANDE HATTARNA, RÖTANS RIKE,
//    JÄTTESVAMPARNAS SKOG. Rumstyper: sporegrotto (sporgrotta), giantcaps (jättesvampar), myceliumden (mycelnäste) och grottans mushroom,
//    boneden, camp, nest. Infödda fiender: ř, ^ och U (vikt x2 utom U); ŗ och Ř byts in. Vaktaren är mycelmodern varannan gång.
//  Biom mirror (SPEGELPALATSET; inomhus, vikt 12, djup 1-5, eget slag ur 'v11'): fängelsehålans bygge (salar + korridorer, inga gårdar) i marmor Š;
//    floors [0] floor_marble, [1] vaktarens (gallerier, bibliotek och matsalar får trägolv, kapell blå plattor); tak floor_marble; blek
//    silverviolett dimma. Namn: SPEGELPALATSET, DE TUSEN SPEGLARNA, MARMORSALARNA, GLASKUNGENS HOV, ILLUSIONERNAS SAL, DEN BRUTNA SPEGELN.
//    Rumstyper: mirrorhall (spegelsal), ballroom (balsal: pelarrader av Š), gallery (konstgalleri) och library, dining, chapel, storeroom, armory.
//    Spegelväggar: salarnas väggar = ringen runt rummets ruta utan hörnen (alla rum utom vaktarens sal, valv och hemliga rum, rutor Š eller š);
//    hela raka segment (minst 2 rutor, synliga från salen, avbrutna vid dörrkarmarna) blir š tills 24-31 % av salarnas väggar är speglar (alltid
//    20-35 %, annars byggs banan om); aldrig på en dörrkarm (ingen dörr/grind/hemlig vägg bland de åtta grannarna) eller vid den hemliga väggen.
//    Infödda fiender: Ś och @ (Ś vikt x2); ś och Ŝ byts in. Vaktaren är spegelkungen varannan gång.
//  Vaktar-/bosstema 'mycelmother' (MYCELMODERN): väggar ş, golv floor_boss_mycelmother, ljus Ŧ, dekor F och j.
//  Vaktar-/bosstema 'mirrorking' (SPEGELKUNGEN): väggar Ţ, golv floor_boss_mirrorking, ljus c, dekor ŧ och u.
//  Bossarena 'fungus' (MYCELMODERNS LYA): grottarenans form i ŝ (berget växer in), svampstjälkar, svamphattar Ş och glödsvampar Ŧ i speglade par,
//    2-4 studsplattor ţ i speglade par (x 3-6 resp. 18-21, y 11-13 och 19-21, fritt runt om), 2-3 speglade sporpölsfläckar Ť om 2-5 rutor
//    (x 1-8 resp. 16-23, aldrig nära P, B eller grinden), glödsvampar i stället för eldfat, ådror av Ş; floors [0] floor_moss, [1] floor_cave; inomhus.
//  Bossarena 'mirror' (SPEGELKUNGENS SAL): raka marmorväggar Š; spegelväggar š i hela segment längs väster- och östväggen (två speglade par,
//    y ca 5-22) och södra väggen på var sida om P; ett teleporterpar ť (level.teleports) speglat på var sida om den fria mitten (x 3-5 resp.
//    19-21, y 12-16, fritt runt om); marmorpelare, spegelpelare š och spegelstatyer ŧ i speglade par; floors [0] floor_marble; inomhus.
//    Båda arenorna har samma P/B/G/x-kontrakt och fria 9x9-mitt som de andra (inga hinder och inga nya golvrutor där).
//  level.features utökas med { bouncepads, sporepools, teleporters, glowshrooms, mirrorstatues, mirrorwalls, capwalls, sporesacks, sporelings,
//    mycelbrutes, shamans, mirrorknights, illusionists, shardlings } (antal tecken på kartan: ţ Ť ť Ŧ ŧ š Ş Ũ ŗ Ř ř Ś ś Ŝ)
//  Gen.secret och Gen.maze har även utseendena fungus (myceltrasslet: svamphattar Ş runt rummen) och mirror (spegellabyrinten: spegelväggar š
//    runt rummen).
//  Frön: vanliga våningar med en gammal biom ger samma bana som i version 10 med sporsäckar ovanpå (underkänns en bana med dem tas de bort igen,
//    opts.v11.undo, och banan blir exakt som i version 10); utan opts.biome ändras bara banorna som slår svampriket eller spegelpalatset.
//    Arenor, hemliga våningar och labyrinter med de gamla utseendena är oförändrade (utom level.teleports och de nya nycklarna i features).
// Version 13 – "Biblioteket och Gjuteriet" (enskilda tecken utanför ASCII; allt nytt har egna slumpflöden ur gaffeln 'v13', content13 körs sist
//   av allt; hyllraderna och kanalerna läggs av rumstyperna, bara i de nya biomerna):
//  Väggar: ũ bokhylla (bibliotekets hyllrader och sträckor om 1-4 rutor i de synliga panelväggarna, aldrig vid den hemliga/spruckna väggen)
//    Ū träpanel (bibliotekets väggar)  ū bibliotekariens vägg (vaktar-/bosstema 'librarian')  ŵ järnplåt (gjuteriets väggar)  Ŷ smältugn (glödande;
//    glesa enstaka rutor i de synliga plåtväggarna, minst 3 rutor isär)  ŷ smideskolossens vägg (vaktar-/bosstema 'colossus')
//  Vapen (föremål, ett per våning via opts.weapon): ƀ runboken (runebook)  Ɓ ångkanonen (steamcannon)
//  Nya fiender (gångbara, räknas som fiender i alla rumsregler, alltid i stridsrum):
//    ų bläckslem (inkslime; bibliotekets egen, djup 1+)  Ų flygande bok (grimoire; biblioteket ~85 % av banorna: alltid en hel grupp om 3-5 i ett
//    stridsrum, djup 3+ ibland två grupper; byts in mot gruppens fiender)  Ŵ arkivariespöke (archivist; biblioteket, djup 2+, ~55 %, 1-2, högst 2;
//    byts in)   ž ångautomat (steambot; gjuteriets egen, djup 1+)  Ž smältgolem (moltengolem; gjuteriet, djup 2+, ~55 %, 1-2, högst 2; byts in i
//    stridsrum om minst 30 gångbara rutor)  ſ gnistdrönare (sparkdrone; gjuteriet ~75 %: alltid en hel grupp om 2-4 i ett stridsrum)
//  Golvrutor (gångbara, aldrig på/intill P och x, aldrig i en dörröppning):
//    Ŭ bläckpöl (biblioteket: 2-4 fläckar om 2-6 rutor i strids- och skattrummen, högst 24 rutor; aldrig intill en dörr)
//    Ź smält metall (gjuteriet: raka kanaler 1-2 rutor breda tvärs över gjuthallarna (alltid) och smältverken (~40 %), med en spång om 1-2 rutor
//      och en lucka där kanalen annars skulle stänga av; saknas de läggs en kanal i en stor sal; ~70 % av banorna har kanaler)
//    ź ångventil (gjuteriet 2-5: på öppet golv i salarna, annars i korridorerna, minst 3 rutor isär, aldrig intill en dörr)
//    Ÿ rullband (gjuteriet 1-4 band: raka sträckor om 4-9 rutor i salarna (rullbandshallarna först) och korridorerna, samma riktning längs bandet,
//      aldrig intill en dörr eller ett annat band; rutan efter bandets slut är fritt golv, aldrig vägg, hinder eller fara). level.belts =
//      [{ x, y, dx, dy }]: en post per Ÿ, (dx, dy) en av (1,0) (-1,0) (0,1) (0,-1). Alla banor (även arenor, hemliga våningar och labyrinter)
//      har level.belts (tom lista när det saknas)
//    validate räknar Ŭ, Ź och ź som lava (aldrig enda vägen: med dem som vägg nås allt ändå); rullbanden är vanligt golv (de går att gå på)
//  Rekvisita: Ű pulpet (lectern; blockerar, use: läs boken; biblioteket 1-3 per bana, högst en per rum, helst i läsesalar och skrivarsalar, aldrig i
//    vaktarens sal, valv eller hemliga rum; fri framsida, nås med grindarna stängda)   ű ljuskrona (chandelier; ljus, blockerar inte: ersätter
//    eldfaten f i biblioteket utom i vaktarens sal; bibliotekariens ljus)   Ż stans/press (press; blockerar, fälla: 1-4 i gjuteriet, först i
//    korridorerna där det finns plats runt om (localOK: aldrig enda vägen), annars i salarna (presshallarna först), minst 4 rutor isär)
//    ż städ/gjutform (anvil; blockerar, dekor: gjuthallar, smältverk, presshallar och 1-3 till mot väggarna; smideskolossens dekor)
//  Föremål (gångbara, alla biomer, med ångra-lista): Ƃ bläckflaska (ammo till runboken; ~20 % av banorna, biblioteket ~40 %, 1-2, högst 2; helst
//    i hemliga rum, valv och skattrum; aldrig i arenor, hemliga våningar eller labyrinter)
//  Biom library (DET FÖRBJUDNA BIBLIOTEKET; inomhus, vikt 12, djup 1-5, i ett eget slag ur gaffeln 'v13' så att övriga seeds behåller sin biom):
//    fängelsehålans bygge (salar + korridorer, inga gårdar) i träpanel Ū med bokhyllor ũ; floors [0] floor_carpet, [1] vaktarens (skrivarsalar,
//    bibliotek och förråd får trägolv, kapell blå plattor); tak floor_wood_planks; dammig brun dimma. Namn: DET FÖRBJUDNA BIBLIOTEKET, LÄSESALEN,
//    DE DAMMIGA GÅNGARNA, ARKIVETS DJUP, DE TYSTA HYLLORNA, BLÄCKETS KAMMARE. Rumstyper: readingroom (läsesal: hyllrader, läsbord, ljus), stacks
//    (hyllgångar: täta hyllrader), scriptorium (skrivarsal: bord i rader, hyllor q), archive (arkiv: hyllor, lådor) och library, storeroom, chapel,
//    crypt. Hyllrader (F.stacks): rader av fristående bokhyllor ũ (1 ruta tjocka) längs salens långsida, varannan rad med en gång emellan, två
//    rutor från långväggarna och en från kortväggarna, i sträckor om 2-4 rutor med luckor om 1-2 rutor; varje sträcka sätts bara om allt som nåddes
//    förut nås ändå (flood fill från P). Infödda fiender: ų och X (ų vikt x2); Ų och Ŵ byts in. Vaktaren är bibliotekarien varannan gång.
//  Biom foundry (GJUTERIET; inomhus, vikt 12, djup 1-5, eget slag ur 'v13'): samma bygge i järnplåt ŵ med smältugnar Ŷ; floors [0]
//    floor_irongrate, [1] vaktarens; tak floor_irongrate; orangeröd rök. Namn: GJUTERIET, SMÄLTVERKET, DE GLÖDANDE HALLARNA, STANSARNAS GÅNGAR,
//    JÄRNETS HJÄRTA, ÅNGANS VERKSTAD. Rumstyper: smeltery (smältverk: eldgropar, gjutformar, ibland en kanal), beltworks (rullbandshall), casting
//    (gjuthall: kanal, gjutformar), pressroom (presshall) och storeroom, armory, prison. Infödda fiender: ž och Æ (ž vikt x2); Ž och ſ byts in.
//    Vaktaren är smideskolossen varannan gång.
//  Vaktar-/bosstema 'librarian' (BIBLIOTEKARIEN): väggar ū, golv floor_boss_librarian, ljus ű, dekor q och u.
//  Vaktar-/bosstema 'colossus' (SMIDESKOLOSSEN): väggar ŷ, golv floor_boss_colossus, ljus f, dekor ż och u.
//  Bossarena 'library' (BIBLIOTEKARIENS LÄSESAL): raka panelväggar Ū med bokhyllor ũ (30 % av de synliga väggrutorna); 3-4 speglade par
//    hyllrader (ũ, 3-4 rutor ut från väster- och östväggen, y 6-22) och korta hyllor som skydd, två pulpeter Ű speglade utanför mitten
//    (x 4-6 resp. 18-20, y 19-22, fri framsida), bokhyllor q, statyer, ljuskronor ű i stället för eldfat; floors [0] floor_carpet, [1]
//    floor_wood_planks (två rutor längs väggarna); inomhus.
//  Bossarena 'foundry' (SMIDESKOLOSSENS GJUTERIHALL): raka plåtväggar ŵ med smältugnar Ŷ; två lodräta rullband (level.belts, 5-6 rutor, x 2-3
//    resp. 20-21, y 6-12: det västra söderut, det östra norrut, rutan efter slutet fri), speglade kanaler med smält metall Ź (y 19-22, x 1-6 resp.
//    18-23, 1-2 breda, en spång), ett speglat par stansar Ż (x 5-7, y 6-9), 1-2 speglade par ångventiler ź (x 4-7, y 12-17), plåtpelare, städ ż
//    och smältugnspelare Ŷ som skydd; floors [0] floor_irongrate; inomhus. Båda arenorna har samma P/B/G/x-kontrakt och fria 9x9-mitt som de
//    andra (inga hinder och inga nya golvrutor där).
//  level.features utökas med { bookshelves, lecterns, chandeliers, inkpools, belts, molten, vents, presses, molds, furnaces, inkflasks, grimoires,
//    inkslimes, archivists, moltengolems, steambots, sparkdrones } (antal tecken på kartan: ũ Ű ű Ŭ Ÿ Ź ź Ż ż Ŷ Ƃ Ų ų Ŵ Ž ž ſ)
//  Gen.secret och Gen.maze har även utseendena library (hyllabyrinten: bokhyllor ũ runt rummen) och foundry (gjuterilabyrinten: smältugnar Ŷ
//    runt rummen).
//  Frön: vanliga våningar med en gammal biom ger samma bana som i version 11 med bläckflaskor ovanpå (underkänns en bana med dem tas de bort igen,
//    opts.v13.undo, och banan blir exakt som i version 11); utan opts.biome ändras bara banorna som slår biblioteket eller gjuteriet.
//    Arenor, hemliga våningar och labyrinter med de gamla utseendena är oförändrade (utom level.belts och de nya nycklarna i features).
// Version 14 – "Arenorna och de gamla biomernas nya invånare" (allt nytt har egna slumpflöden ur gaffeln 'v14', content14 körs sist av allt, allt med
//   ångra-lista: opts.v14.undo (rutan och tecknet som stod där förut) och opts.v14.arch (rummets index och gamla rumstyp); underkänns banan tas allt
//   bort igen, level.arenas töms och banan blir exakt som i version 13, se build7; opts.v14off stänger av version 14 helt):
//  Nya fiender (gångbara, räknas som fiender i alla rumsregler; byts in mot redan utplacerade fiender i stridsrummen, utom spindelbon, så att
//    gruppernas storlek står kvar; FOE_FROM och biomens egna kan bytas):
//    Ƅ snöfantom (frost, djup 1+, ~60 %, 1-3, högst 3)   ƅ lavaorm (vulkanen, djup 2+, ~60 %, 1-2, högst 2; helst inom 2 rutor från lava _)
//    Ɔ skarabépräst (gravkammaren, djup 2+, ~55 %, 1-2, högst 2)   Ƈ kristallspindel (kristallgrottorna, djup 1+, ~60 %, 1-3, högst 3)
//    ƈ marulk (sjunkna staden, djup 1+, ~65 %, 1-2, högst 3; bara på en ruta med djupt vatten Đ, tidvatten Ĕ, luftbubbla Ĝ eller ål Ó bland de åtta
//      grannarna: en fiende där byts in, annars flyttas en fiende i rummet till en golvruta vid vattnet)   Ɖ vindande (molnborgen, djup 2+, ~55 %, 1-2,
//      högst 2). validate: bara i sin biom, på tillåtna djup, högst taket, marulken vid vattnet.
//  Arenarum: level.arenas = [{ x0, y0, x1, y1, doors: [{ x, y }], waves }] (alla banor har fältet, tom lista när det saknas: även arenor, hemliga
//    våningar och labyrinter). x0..x1, y0..y1 är rummets inre rutor (inklusive, rummets rutor och väggar som pelare/runda hörn, minst 5x5), kanten runt
//    om är vägg utom dörröppningarna ('D', 'G' eller golvöppningar, 1-4 st, aldrig hörnen, aldrig grindar | ] { eller hemliga väggar *), som alla står i
//    doors; dörröppningen och rutan innanför är fria (inga hinder eller rekvisita); mitten (belöningen) är fritt golv. waves 2 (3 från djup 4). 0-1 per
//    vanlig bana från djup 2 (~60 % av banorna försöker; ~45 % av banorna på djup 2+ i biomerna med raka rum, nästan aldrig i grottans, skogens,
//    träskets och kyrkogårdens organiska områden), bara i stridsrum av typ normal/elite: aldrig startrummet, vaktarens sal, utgångens rum,
//    valv, hemliga rum, specialrum, butiken; aldrig P, x, Z, nyckel }, teleporter ť eller hemlig trappa ÷ i arenan. validate: rektangeln inom kartan och
//    minst 5x5, 2-3 vågor, dörrarna i kanten och öppna, inga P/x/Z/} i arenan, och med dörrarna som vägg når en flood fill aldrig utanför rektangeln.
//  Nya rumstyper (bara befintliga tecken; ~40 % av banorna försöker, högst en per bana): ett stridsrum (normal/elite, ingen farlig rumstyp, inget spindelbo,
//    inga tecken som rumstypen licensierar: ( ) ? ; > ũ Ź ż Ű ² ¯, lava/is/vatten bara där biomen tillåter dem i alla rum) byggs om: mönstret stämplas
//    på fria golvrutor (aldrig vid dörrar, P eller x; hinder bara på olåsta rutor där de inte stänger av något) och rummets arch blir rumstypens id;
//    allt som nåddes från P förut (hinder och faror: en granne) nås ändå, annars ångras rummet. Valet görs i content14 (inte i ARCH_BY), så att
//    huvudslumpen är orörd. Rumstyper: pillargallery (dungeon: pelarsal med galleri, pelare i salens väggtecken)  stalagmites (caves: droppstenar)
//    gravevault (graveyard: kistrader och gravstenar)  stonecircle (forest: stencirkel)  colonnade (courtyard: pelargång av statyer)
//    drownedcrypt (swamp: översvämmad krypta med vatten - och kistor)  icehall (frost: isbelagd sal med frusna statyer)  lavabridge (volcano: bro över en
//    lavaström)  obeliskhall (tomb: obelisker och likkistor)  crystalnave (crystal: kristallkatedral, ring av kristaller i)  drownedgallery (sunken: statyer)
//    assemblyhall (clock: bordsrader och lådor)  windshrine (sky: statyring)  capgarden (fungus: svampträdgård F)  statuegallery (mirror: statyrader)
//    readingnook (library: bordsrader och bokhyllor q)  crateyard (foundry: lådrader och ställ). Gen.ARCHES har även de nya id:na.
//  level.features utökas med { snowwraiths, lavaworms, scarabpriests, crystalspiders, anglerfish, windspirits } (antal tecken Ƅ ƅ Ɔ Ƈ ƈ Ɖ), arenas
//    (antal arenor) och setpieces (antal rum med en ny rumstyp).
//  Frön: samma bana som i version 13 med de nya sakerna ovanpå (opts.v14off: exakt version 13). Arenor, hemliga våningar och labyrinter är
//    oförändrade (utom level.arenas = [] och de nya nycklarna i features).
// Version 15 och 16 – "Katedralen och Bikupan", "Trädgården och Drömriket" (fyra nya biomer; allt nytt i de gamla biomerna har egna slumpflöden ur
//   gafflarna 'v15' (katedralen, bikupan, bikupor ƞ, korgossar/keruber/arbetsbin i andra biomer) och 'v16' (trädgården, drömriket, drömflaskor Ƴ,
//   taggrankor/drömätare/sömngångare i andra biomer); content15 och content16 körs efter content14, allt i de gamla biomerna och föremålen med
//   ångra-listor (opts.v15.undo, opts.v16.undo: underkänns banan tas det bort igen, först version 16, sedan 15, se build7). Två gafflar i stället för
//   en: version 16 är en egen utgåva, så opts.v16off ger exakt version 15 och opts.v15off (som också stänger av version 16) exakt version 14.
//  Biomer (alla i egna slag i biomvalet, gafflarna 'v15'/'v16'; utan opts.biome ändras bara banorna som slår någon av dem; opts.biome går alltid):
//    cathedral BLODKATEDRALEN (inomhus, vikt 12, djup 2-5): fängelsehålans bygge i katedralsten Ɗ med ett avlångt långhus (10-13 x 7-8, aldrig start-,
//      special-, skatt-, butiks- eller helgedomsrum); floors [0] floor_cathedral, [1] vaktarens; tak floor_stone_pattern; mörkröd dimma.
//      Rumstyper: nave (långhus: mittgång med röd matta floor_carpet, bänkar Ǝ i par tvärs över salen var annan rad, kor med altare/staty och ljus;
//      varje bänkhalva bara om allt nås ändå), baptistery (dopkapell: blodfunt Ə i mitten, ljus, bänk), belltower (klocktorn i små salar: klocka Ɛ,
//      högst två per bana), chapel, crypt, ossuary, library, storeroom. content15: blyinfattade fönster Ƌ i katedralstenen runt salarna (långhuset
//      tätt) och ljusstråk ƍ (1-3 rutor) på golvet framför många av dem, bänkar i kapellen, ibland en blodfunt till (högst 3) och en klocka (högst 2),
//      korgossar Ƒ (~70 %, 1-2, alltid i en grupp om minst 3). Infödda: ƒ botgörare (x2) och Ɯ kerub. Väktaren: kardinalen varannan gång.
//    hive BIKUPAN (inomhus, vikt 12, djup 2-5): samma bygge i vax Ɠ med sexkantiga celler (rumsformen 'hex': spetsiga kortsidor); floors [0]
//      floor_hivefloor; tak floor_hivefloor; bärnstensdimma. Rumstyper: hexcell (vaxcell: larvsäckar Ɨ, ben), nursery (larvkammare: rader av
//      larvsäckar), honeyhall (honungssal: krukor, lådor; flest honungspölar), storeroom. content15: honungskakor Ɣ i vaxväggarna, honung Ɩ (3-5
//      fläckar om 2-6 rutor, högst 36, aldrig enda vägen), 1-3 larvsäckar till (högst 10), arbetsbin Ƙ i svärmar om 3-6 (en hel grupp byts mot bin,
//      en grupp om 2 får ett bi till; ~90 %, djup 3+ ibland två svärmar), gaddkrigare ƙ (djup 2+, ~60 %, 1-2, högst 2). Infödd: ƚ larv (x2).
//      Väktaren: bidrottningen varannan gång.
//    garden DEN DÖDA TRÄDGÅRDEN (utomhus, vikt 12, djup 3-5): molnborgens bygge under öppen himmel (salar = trädgårdsrum, gårdar = gräsmattor med
//      klippta häckar och träd, korridorer = häckgångar) med häckar Ɵ som väggar; floors [0] floor_garden, [1] vaktarens, [2] floor_ground_grass
//      (gräsmattorna). Rumstyper: walledgarden (murad trädgård: häcken runt rummet blir trädgårdsmur Ơ, träd, stenstaty ƨ), hedgewalk (häckgångar:
//      rader av häckar med luckor), statuewalk (statygång: stenstatyer i rader), fountaincourt (fontängård: fontän Ƨ i mitten, högst två per bana,
//      statyer och ljus runt om), statues. content16: taggrankor ƥ (2-4 fläckar om 2-6 rutor, högst 30, aldrig enda vägen: de skadar och saktar men
//      brinner bort), 1-2 statyer till, ofta en fontän, taggrankor Ƭ (fienden, ~75 %, 1-3, högst 4, helst vid en vägg), stenänglar ƫ (djup 2+, ~55 %,
//      1-2, högst 2). Infödd: ƭ trädgårdsdräng (x2). Väktaren: trädgårdsmästaren varannan gång.
//    dream DRÖMRIKET (inomhus, vikt 12, djup 3-5): fängelsehålans bygge i drömvägg Ƣ; floors [0] floor_dream, [1] vaktarens; tak floor_dream; lila.
//      Rumstyper: chessboard (schackbrädesal: varannan ruta floor_marble, statyer i ett rutnät, drömlyktor ƪ), shifthall (de glidande väggarnas sal,
//      alltid en om någon sal passar), falsedoors (falska dörrar Ʃ mot väggarna, högst 4 per bana), statues, library, chapel. content16: drömlyktor ƪ i
//      stället för eldfaten (utom i vaktarens sal), glidande väggar i korridorerna (1-3 sträckor om 1-2 rutor; färre än två på banan: i stridsrummen),
//      sömnens dimma Ʀ (2-4 fläckar, högst 30), ibland en falsk dörr till, speglingar Ư (djup 2+, ~50 %, 1-2, högst 2) och sömngångare ư (djup 2+,
//      ~60 %, 1-2, högst 3). Infödd: Ʈ drömätare (x2). Väktaren: Jon Blund varannan gång.
//  Glidande väggar ƣ (bara i drömriket och Jon Blunds arena): en vägg (WALLS) som spelet sänker och höjer (uppe 2 s, nere 2 s). level.shifts =
//    [{ x, y, ph }] (ph 0-3.9 s, en fas per sträcka) stämmer exakt med ƣ på kartan; alla banor har fältet (tom lista när det saknas). Läggs bara på
//    olåsta, oreserverade golvrutor i rummen/korridorerna, aldrig intill (åtta grannar) en dörr/grind/hemlig vägg, aldrig inom 2 rutor från P och x,
//    aldrig i eller kring ett arenarum, och varje sträcka bara om allt som nåddes förut nås med väggen uppe (flood fill med ƣ som vägg): nere är rutan
//    vanligt golv, så ingenting kan stängas in, och ingen glidande vägg ligger på enda vägen till något (utgång, nyckel, väktare, rum).
//  Vapen: ƛ rökelsekaret (censer)  Ɲ bikastaren (hivelauncher)  Ʊ trädgårdssaxen (shears)  Ʋ drömstaven (dreamstaff). Föremål (alla biomer, ångra-lista,
//    aldrig i arenor/hemliga våningar/labyrinter): ƞ bikupa (ammo bees; ~20 %, bikupan ~40 %, 1-2, högst 2), Ƴ drömflaska (ammo dreams; ~20 %,
//    drömriket ~40 %, 1-2, högst 2), helst i hemliga rum, valv och skattrum.
//  Nya fiender i de närliggande gamla biomerna (ångra-lista, inbytta i stridsrummen): Ƒ korgosse (fängelsehålan ~10 %, i en grupp om 3+), Ɯ kerub
//    (kyrkogården ~10 %), Ƙ arbetsbin (en hel svärm om 3-6 i skogen/träsket ~8 %), Ƭ taggranka (skogen/borggården ~12 %, 1-2), Ʈ drömätare
//    (spegelpalatset/biblioteket ~10 %), ư sömngångare (kyrkogården, djup 2+, ~8 %).
//  Väktare/bosstema: cardinal KARDINALEN (väggar ƌ, golv floor_boss_cardinal, ljus c, dekor kyrkbänkar Ǝ och statyer), queenbee BIDROTTNINGEN (ƕ,
//    floor_boss_queenbee, f, ben/statyer/lådor), gardener TRÄDGÅRDSMÄSTAREN (ơ, floor_boss_gardener, f, stenstatyer ƨ och ben), sandman JON BLUND (Ƥ,
//    floor_boss_sandman, drömlyktor ƪ, statyer och kistor). Alla fyra kan vakta i alla biomer (spelet drar väktaren ur hela bosspoolen).
//  Bossarenor (Gen.ARENAS; spelets bossPool tar med kardinalen, bidrottningen, trädgårdsmästaren och Jon Blund): 'cathedral' KARDINALENS KOR,
//    'hive' BIDROTTNINGENS KAMMARE, 'garden' TRÄDGÅRDSMÄSTARENS RABATTER, 'dream' JON BLUNDS SOVKAMMARE (se ARENAS); samma P/B/G/x-kontrakt och fria
//    9x9-mitt som de andra, byggs även utan boss.
//  Arenarum (version 14) och de handgjorda rumstyperna fungerar i de nya biomerna: cloister (katedralen: korsgång), waxpillars (bikupan: vaxpelare),
//    topiary (trädgården: klippta häckar och statyer), dreamgallery (drömriket: statyring och lyktor). Aldrig glidande väggar i en arena.
//  Gen.secret och Gen.maze har utseendena cathedral (fönster runt rummen), hive (honungskakor), garden (häcklabyrint under himlen med trädgårdsmur
//    runt rummen) och dream.
//  level.features utökas med { stainedglass, lightbeams, pews, bloodfonts, churchbells, honeycomb, honey, larvasacs, beehives, choirboys, flagellants,
//    cherubs, workerbees, stingerknights, larvae, hedges, gardenwalls, shiftwalls, thorns, dreammist, fountains, statues2, falsedoors, dreamlamps,
//    dreamflasks, weepingangels, thornvines, gardeners, dreameaters, doppelgangers, sleepwalkers } (antal tecken på kartan).
//  validate: tecknen bara där de får finnas (även arenor, hemliga våningar, labyrinter; väktarnas väggar/ljus/dekor i alla biomer), fienderna i sina
//    biomer på tillåtna djup under taken (aldrig i arenor), tak för klockor/funtar/larvsäckar/honung/ljusstråk/bikupor/fontäner/falska dörrar/
//    taggrankor/dimma/drömflaskor/glidande väggar, golvrutorna ƍ Ɩ ƥ Ʀ aldrig i dörröppningar, Ɩ och ƥ aldrig enda vägen (som lava), ƣ aldrig i
//    kanten eller intill en dörr, level.shifts exakt som kartan, ingen ƣ i en arenas kant; nåbarheten räknar ƣ som vägg.
//  Frön: vanliga våningar med en gammal biom ger samma bana som i version 14 med de nya fienderna inbytta och bikupor/drömflaskor ovanpå (opts.v15off:
//    exakt version 14, opts.v16off: bara version 15-sakerna); utan opts.biome ändras dessutom banorna som slår de nya biomerna. Arenor, hemliga
//    våningar och labyrinter med de gamla utseendena är oförändrade (utom level.shifts = [] och de nya nycklarna i features). Väktarna med de gamla
//    id:na ger samma banor; vapnen ƛ Ɲ Ʊ Ʋ och väktarna cardinal/queenbee/gardener/sandman används nu (förut ignorerades de, så de banorna ändras).
(function () {
  // vapen på kartan: g hagelgevär, r gevär, m kpist, d dubbelbössa, b armborst, s signalpistol, p prickskyttegevär,
  // å yxa, ä eldkastare, ö granatkastare, é spikpistol, ü stav, ñ båge, ô kastknivar, û hammare, ï musköt, À harpun, Á bumerang, Â prisma,
  // Į sågbladskastare, į vindbössa, Ĳ spjut, Ŕ sporkastare, ŕ spegelsköld, Ŗ piska, ƀ runboken, Ɓ ångkanonen.
  // opts.weapon får vara tecknet eller vapnets id ('axe', 'bow', 'harpoon', ...)
  const WEAPONS = { g: 'shotgun', r: 'rifle', m: 'smg', d: 'dbshotgun', b: 'crossbow', s: 'flaregun', p: 'sniper', 'å': 'axe', 'ä': 'flamer', 'ö': 'launcher',
    'é': 'nailgun', 'ü': 'staff', 'ñ': 'bow', 'ô': 'knives', 'û': 'hammer', 'ï': 'musket', 'À': 'harpoon', 'Á': 'boomerang', 'Â': 'prism',
    'Į': 'sawlauncher', 'į': 'windgun', 'Ĳ': 'spear', // version 9: sågbladskastare, vindbössa, spjut
    'Ŕ': 'sporelauncher', 'ŕ': 'mirrorshield', 'Ŗ': 'whip', // version 11: sporkastare, spegelsköld, piska
    'ƀ': 'runebook', 'Ɓ': 'steamcannon', // version 13: runboken, ångkanonen
    'ƛ': 'censer', 'Ɲ': 'hivelauncher', // version 15: rökelsekaret, bikastaren
    'Ʊ': 'shears', 'Ʋ': 'dreamstaff' }; // version 16: trädgårdssaxen, drömstaven
  const WEAPON_CHARS = Object.keys(WEAPONS).join('');
  const weaponChar = w => (!w ? null : WEAPONS[w] ? w : Object.keys(WEAPONS).find(c => WEAPONS[c] === w) || null);
  'use strict';

  const RNG = window.RNG;
  const DX = [1, 0, -1, 0], DY = [0, 1, 0, -1]; // 0=Ö 1=S 2=V 3=N
  const RX = [0, 1, 1, 1, 0, -1, -1, -1], RY = [-1, -1, 0, 1, 1, 1, 0, -1]; // ringen runt en ruta: N NÖ Ö SÖ S SV V NV

  // teckentabeller (snabbare än strängsökning i de heta looparna)
  const INTERACT = '()[?;/'; // städ, spåaltare, fångbur, utmaningsaltare, offerskål, spak (blockerar)
  const NPCS = '£€©'; // alkemist, präst, husdjursbur: blockerar som rekvisita, fri framsida, måste nås
  const INTER6 = '¶®÷'; // version 6: lägereld, anslagstavla, hemlig trappa (blockerar, fri framsida)
  const BARRELS6 = 'µß'; // version 6: gifttunna, frosttunna (blockerar, kan skjutas som e)
  const INTER7 = '²³'; // version 7: sarkofag, larmklocka (blockerar, fri framsida)
  const NPCS7 = 'çÿý'; // version 7: spelare, bankir, vandrare (blockerar, fri framsida, måste nås)
  const PROPS8 = 'ĖĘ'; // version 8: brytande kristall, glödkristall (blockerar)
  const INTER8 = 'ĚĠ'; // version 8: vrakkista, talangaltare (blockerar, fri framsida)
  const NPCS8 = 'Ğ'; // version 8: kartografen (blockerar, fri framsida, måste nås)
  const PROPS9 = 'Ņņ'; // version 9: urverk, blixtstång (blockerar)
  const INTER9 = 'Ňň'; // version 9: klockspel, molnkista (blockerar, fri framsida, måste nås)
  const INTER10 = 'Œ'; // version 10: legendaltaret (blockerar, fri framsida, måste nås)
  const PROPS11 = 'Ŧŧ'; // version 11: glödsvamp (ljuskälla), spegelstaty (blockerar)
  const INTER13 = 'Ű', PROPS13 = 'Żż'; // version 13: pulpet (blockerar, fri framsida, måste nås); stans/press och städ/gjutform (blockerar)
  // version 15: blodfunt och klocka (blockerar, fri framsida, måste nås); kyrkbänk och larvsäck (blockerar)
  // version 16: fontän och falsk dörr (blockerar, fri framsida, måste nås); stenstaty (blockerar); drömlykta ƪ (ljus, blockerar inte)
  const INTER15 = 'ƏƐ', PROPS15 = 'ƎƗ', INTER16 = 'ƧƩ', PROPS16 = 'ƨ';
  const BLOCK_PROPS = 'tnkquvwyeHJT' + INTERACT + INTER6 + BARRELS6 + INTER7 + PROPS8 + INTER8 + PROPS9 + INTER9 + INTER10 + PROPS11 + INTER13 + PROPS13
    + INTER15 + PROPS15 + INTER16 + PROPS16; // rekvisita som blockerar spelaren
  const PROP_CHARS = 'ckjquvwyzeiFHJT' + INTERACT + INTER6 + BARRELS6 + INTER7 + PROPS8 + INTER8 + PROPS9 + INTER9 + INTER10 + PROPS11 + INTER13 + PROPS13 + 'ű'
    + INTER15 + PROPS15 + INTER16 + PROPS16 + 'ƪ'; // ny rekvisita (räknas som rummets dekor; ű ljuskrona och ƪ drömlykta blockerar inte)
  const GATES = '|]{'; // järngrind, låst dörr, sprucken vägg: blockerar tills de öppnas
  const WALLS = '0123456789#%~&=Ø¦Ò¤ÈÌÙ' + 'ĄĆĈĊČĎ' + 'ĹĺĻļĽľ' + 'ŝŞşŠšŢ' // version 11: svampvägg, svamphatt, mycelmoderns, marmor, spegel, spegelkungens
    + 'ũŪūŵŶŷ' // version 13: bokhylla, träpanel, bibliotekariens, järnplåt, smältugn, smideskolossens
    + 'ƊƋƌƓƔƕ' // version 15: katedralsten, blyinfattat glas, kardinalens, vax, honungskaka, bidrottningens
    + 'ƟƠơƢƣƤ'; // version 16: häck, trädgårdsmur, trädgårdsmästarens, drömvägg, glidande vägg (ƣ: vägg halva tiden), mardrömsherrens
  // version 9: tomrum Ń (avgrund: ingen går där, allt nås utan den), sågspår Ŀ och tidsbubblor ŀ (aldrig enda vägen, som lava)
  const VOID9 = 'Ń', SINK9 = 'Ŀŀ';
  // version 11: studsplatta ţ, sporpöl Ť och teleporter ť (gångbara rutor som aldrig är enda vägen: generatorn räknar dem som hinder)
  const SINK11 = 'ţŤť';
  // version 13: bläckpöl Ŭ, smält metall Ź och ångventil ź (aldrig enda vägen: generatorn räknar dem som hinder); rullbandet Ÿ är vanligt golv
  // som får vara enda vägen (det går att gå på), men ligger aldrig på/intill P och x
  const SINK13 = 'ŬŹź', BELT13 = 'Ÿ';
  // version 15: honung Ɩ (mycket långsam) och version 16: taggrankor ƥ (river, brinner bort): aldrig enda vägen (generatorn räknar dem som hinder);
  // ljusstråk ƍ (välsignar) och sömnens dimma Ʀ är gångbara golvrutor som får ligga på vägen, men aldrig på/intill P och x eller i dörröppningar.
  // Den glidande väggen ƣ är en vägg (WALLS): allt nås med den uppe, och den står aldrig intill en dörr
  const SINK15 = 'Ɩ', SINK16 = 'ƥ', FLOOR15 = 'ƍ', FLOOR16 = 'Ʀ', SHIFT16 = 'ƣ';
  const WET8 = 'ĐĒĔĜÓ'; // version 8: djupt vatten, kristallspikar, tidvatten, luftbubblor, ål (står i vattnet): aldrig enda vägen
  const WATER8 = 'ĐĔĜÓ'; // simbart vatten (kristallspikarna räknas som lava)
  // teckentabeller över hela BMP (de nya tecknen ligger utanför ASCII, € = 8364)
  const T_WALL = new Uint8Array(65536), T_BLOCK = new Uint8Array(65536), T_GEN = new Uint8Array(65536), T_WET = new Uint8Array(65536);
  for (const c of WALLS) T_WALL[c.charCodeAt(0)] = 1;
  for (const c of WALLS + 'fM' + BLOCK_PROPS + GATES + NPCS + NPCS7 + NPCS8 + VOID9) T_BLOCK[c.charCodeAt(0)] = 1;
  for (const c of WALLS + 'fMo_z¬¯' + WET8 + BLOCK_PROPS + GATES + NPCS + NPCS7 + NPCS8 + VOID9 + SINK9 + SINK11 + SINK13 + SINK15 + SINK16) T_GEN[c.charCodeAt(0)] = 1; // lava, spikar, smulande golv, kvicksand och vatten ska alltid gå att gå runt
  for (const c of WET8) T_WET[c.charCodeAt(0)] = 1;
  const isWall = c => T_WALL[c.charCodeAt(0)] === 1;
  const isBlock = c => T_BLOCK[c.charCodeAt(0)] === 1; // blockerar spelaren
  const genBlk = c => T_GEN[c.charCodeAt(0)] === 1; // generatorn räknar även krukor, lava och spikar som hinder
  const isWet = c => T_WET[c.charCodeAt(0)] === 1;
  const isDoorCh = c => c === 'D' || c === 'G' || c === '*' || c === '|' || c === ']' || c === '{';
  const isInter = c => INTERACT.includes(c) || NPCS.includes(c) || INTER6.includes(c) || INTER7.includes(c) || NPCS7.includes(c) || INTER8.includes(c) || NPCS8.includes(c) || INTER9.includes(c) || c === 'Œ' || c === 'Ű'
    || c === 'Ə' || c === 'Ɛ' || c === 'Ƨ' || c === 'Ʃ'; // fri framsida, ska nås med grindarna stängda
  const HAZARD = '_-:"z<>Ç°¬±¨¯¹' + 'ĐĒĔĜ' + 'ĿŀŃń' + SINK11 + SINK13 + BELT13 + SINK15 + SINK16 + FLOOR15 + FLOOR16; // farliga golv och fällor (och tomrummet, rullbanden): aldrig på eller intill P och x
  const cheb = (ax, ay, bx, by) => Math.max(Math.abs(ax - bx), Math.abs(ay - by));

  // ---------- Biomer ----------
  const BIOMES = [
    { id: 'dungeon', name: 'KATAKOMBER', outdoor: false, weight: 40, depth: [1, 5] },
    { id: 'caves', name: 'GROTTOR', outdoor: false, weight: 20, depth: [1, 5] },
    { id: 'graveyard', name: 'KYRKOGÅRD', outdoor: true, weight: 15, depth: [1, 5] },
    { id: 'forest', name: 'SKOG', outdoor: true, weight: 12, depth: [1, 4] },
    { id: 'courtyard', name: 'BORGGÅRD', outdoor: true, weight: 13, depth: [2, 5] }, // delvis utomhus: gården har himmel
    { id: 'swamp', name: 'TRÄSKET', outdoor: true, weight: 12, depth: [1, 4] }, // vattenkanaler, mossöar, spänger och pålhyddor
    { id: 'frost', name: 'FROSTFÄSTET', outdoor: true, weight: 12, depth: [1, 5] }, // frusna salar kring snötäckta gårdar
    { id: 'volcano', name: 'VULKANEN', outdoor: true, weight: 12, depth: [1, 5] }, // obsidiansalar, lavafloder och askfält under röd himmel
    { id: 'tomb', name: 'GRAVKAMMAREN', outdoor: true, weight: 12, depth: [1, 5] }, // sandstenssalar, sandfyllda gångar och gårdar under ökensolen
    { id: 'crystal', name: 'KRISTALLGROTTORNA', outdoor: false, weight: 12, depth: [1, 5] }, // version 8: kristallgrottor med glödkristaller och spikar
    { id: 'sunken', name: 'DEN SJUNKNA STADEN', outdoor: true, weight: 12, depth: [1, 5] }, // version 8: översvämmade ruiner, bassänger, tidvatten
    { id: 'clock', name: 'KLOCKTORNET', outdoor: false, weight: 12, depth: [1, 5] }, // version 9: mässingssalar, urverk, sågspår och tidsbubblor
    { id: 'sky', name: 'MOLNBORGEN', outdoor: true, weight: 12, depth: [1, 5] }, // version 9: flytande öar över tomrummet, broar och vindbyar
    { id: 'fungus', name: 'SVAMPRIKET', outdoor: false, weight: 12, depth: [1, 5] }, // version 11: svampgrottor, glödsvampar, studsplattor och sporpölar
    { id: 'mirror', name: 'SPEGELPALATSET', outdoor: false, weight: 12, depth: [1, 5] }, // version 11: marmorsalar, spegelväggar och teleportrar
    { id: 'library', name: 'DET FÖRBJUDNA BIBLIOTEKET', outdoor: false, weight: 12, depth: [1, 5] }, // version 13: läsesalar, bokhyllegångar, pulpeter och bläckpölar
    { id: 'foundry', name: 'GJUTERIET', outdoor: false, weight: 12, depth: [1, 5] }, // version 13: järnplåt, smältugnar, rullband, smält metall, ångventiler och stansar
    // version 15 (mellersta djup): långhus med bänkrader, kapell och klocktorn; sexkantiga vaxceller, larvkammare och honungssalar
    { id: 'cathedral', name: 'BLODKATEDRALEN', outdoor: false, weight: 12, depth: [2, 5] },
    { id: 'hive', name: 'BIKUPAN', outdoor: false, weight: 12, depth: [2, 5] },
    // version 16 (sena djup): murade trädgårdar och häckgångar under himlen; schackbrädesalar, glidande väggar och falska dörrar
    { id: 'garden', name: 'DEN DÖDA TRÄDGÅRDEN', outdoor: true, weight: 12, depth: [3, 5] },
    { id: 'dream', name: 'DRÖMRIKET', outdoor: false, weight: 12, depth: [3, 5] },
  ];

  // ---------- Vaktare/bossar: väggtecken, golvtextur, ljuskälla och dekor runt salens kanter ----------
  const GUARDIANS = {
    demon: { wall: '#', floor: 'floor_boss_demon', light: 'f', decor: 'jjkk' },
    beast: { wall: '%', floor: 'floor_boss_beast', light: 'f', decor: 'jjju' },
    nightmare: { wall: '~', floor: 'floor_boss_nightmare', light: 'c', decor: 'nnnu' },
    ogre: { wall: '&', floor: 'floor_boss_ogre', light: 'f', decor: 'jjvv' },
    ghost: { wall: '=', floor: 'floor_boss_ghost', light: 'c', decor: 'uukk' },
    frost: { wall: '¦', floor: 'floor_boss_frost', light: 'c', decor: 'uuii' },
    flame: { wall: '¤', floor: 'floor_boss_volcano', light: 'f', decor: 'uuii' },
    pharaoh: { wall: 'Ù', floor: 'floor_boss_pharaoh', light: 'c', decor: 'uu²²' },
    crystalqueen: { wall: 'Ĉ', floor: 'floor_boss_crystalqueen', light: 'Ę', decor: 'iiuu' }, // version 8
    leviathan: { wall: 'Ď', floor: 'floor_boss_leviathan', light: 'c', decor: 'jjuu' }, // version 8 (salen får en bassäng Đ)
    clockmaker: { wall: 'Ļ', floor: 'floor_boss_clockmaker', light: 'f', decor: 'ŅŅuu' }, // version 9: urmakaren (dekor: urverk)
    thunderbird: { wall: 'ľ', floor: 'floor_boss_thunderbird', light: 'f', decor: 'ņņuu' }, // version 9: stormfågeln (dekor: blixtstänger)
    mycelmother: { wall: 'ş', floor: 'floor_boss_mycelmother', light: 'Ŧ', decor: 'FFjj' }, // version 11: mycelmodern (ljus: glödsvampar)
    mirrorking: { wall: 'Ţ', floor: 'floor_boss_mirrorking', light: 'c', decor: 'ŧŧuu' }, // version 11: spegelkungen (dekor: spegelstatyer)
    librarian: { wall: 'ū', floor: 'floor_boss_librarian', light: 'ű', decor: 'qquu' }, // version 13: bibliotekarien (ljus: ljuskronor, dekor: bokhyllor)
    colossus: { wall: 'ŷ', floor: 'floor_boss_colossus', light: 'f', decor: 'żżuu' }, // version 13: smideskolossen (dekor: städ/gjutformar)
    cardinal: { wall: 'ƌ', floor: 'floor_boss_cardinal', light: 'c', decor: 'ƎƎuu' }, // version 15: kardinalen (dekor: kyrkbänkar)
    queenbee: { wall: 'ƕ', floor: 'floor_boss_queenbee', light: 'f', decor: 'jjuT' }, // version 15: bidrottningen
    gardener: { wall: 'ơ', floor: 'floor_boss_gardener', light: 'f', decor: 'ƨƨjj' }, // version 16: trädgårdsmästaren (dekor: stenstatyer)
    sandman: { wall: 'Ƥ', floor: 'floor_boss_sandman', light: 'ƪ', decor: 'uukk' }, // version 16: Jon Blund (ljus: drömlyktor)
  };
  // slumpad vaktare (utan opts.guardian): de fem ursprungliga; i frostfästet blir det frostväktaren varannan gång
  const GUARD_IDS = ['demon', 'beast', 'nightmare', 'ogre', 'ghost'];

  // ---------- Teman (dungeon) ----------
  const THEMES = [
    { id: 'katakomber', wall: '1', floor: 'floor_stone_pattern', ceil: 'floor_stone', fog: [18, 14, 12], ambient: [0.17, 0.22], depth: [1, 5],
      names: ['KATAKOMBERNA', 'DE DJUPA KATAKOMBERNA', 'GRAVKAMMARNA'] },
    { id: 'blodsal', wall: '2', floor: 'floor_stone', ceil: 'floor_stone_pattern', fog: [26, 8, 8], ambient: [0.15, 0.19], depth: [1, 5],
      names: ['BLODSALEN', 'SLAKTHUSET', 'BLODKAMMARNA'] },
    { id: 'benhus', wall: '3', floor: 'floor_stone', ceil: 'floor_stone', fog: [20, 17, 12], ambient: [0.14, 0.19], depth: [1, 4],
      names: ['BENHUSET', 'BENKAMMARNA', 'SKELETTGROTTAN'] },
    { id: 'valv', wall: '4', floor: 'floor_wood_planks', ceil: 'floor_stone', fog: [10, 10, 22], ambient: [0.13, 0.17], depth: [2, 5],
      names: ['VALVEN', 'VAMPYRENS BORG', 'DE GAMLA VALVEN'] },
    { id: 'kapell', wall: '5', floor: 'floor_tiles_blue', ceil: 'floor_stone', fog: [14, 6, 20], ambient: [0.12, 0.16], depth: [1, 5],
      names: ['KAPELLET', 'KLOSTRET', 'HELGEDOMEN'] },
    { id: 'fangelse', wall: '4', floor: 'floor_stone', ceil: 'floor_wood_planks', fog: [12, 14, 10], ambient: [0.13, 0.18], depth: [1, 5],
      names: ['FANGHALAN', 'FANGELSET', 'TORTYRKAMMARNA'] },
    { id: 'krypta', wall: '3', floor: 'floor_tiles_blue', ceil: 'floor_stone_pattern', fog: [8, 14, 18], ambient: [0.13, 0.18], depth: [2, 5],
      names: ['DEN BLA KRYPTAN', 'ISKRYPTAN', 'DE DRUNKNADES GRAV'] },
  ];
  const BOSS_THEMES = [
    { wall: '4', floor: 'floor_tiles_blue', ceil: 'floor_stone_pattern', fog: [20, 6, 10], ambient: [0.15, 0.2], names: ['TRONSALEN', 'DEN SISTA SALEN', 'HERRSKARENS SAL'] },
    { wall: '2', floor: 'floor_stone_pattern', ceil: 'floor_stone', fog: [28, 6, 6], ambient: [0.15, 0.19], names: ['TRONSALEN', 'BLODTRONEN', 'MORDETS SAL'] },
    { wall: '5', floor: 'floor_wood_planks', ceil: 'floor_stone', fog: [14, 6, 22], ambient: [0.14, 0.18], names: ['TRONSALEN', 'KUNGENS SAL', 'DEN MORKA TRONEN'] },
  ];
  // övriga biomers utseende (byggfunktionerna läggs in längre ned)
  const NIGHT_FOG = rng => [rng.int(10, 14), rng.int(12, 16), rng.int(22, 26)]; // mörkblå natt
  const SWAMP_FOG = rng => [rng.int(12, 16), rng.int(19, 24), rng.int(11, 15)]; // grön, grumlig träskdimma
  const LOOKS = {
    caves: { wall: '8', floors: ['floor_cave', 'floor_mud'], ceil: 'ceil_cave', ambient: [0.12, 0.17],
      fog: rng => rng.pick([[12, 10, 9], [8, 10, 14], [10, 12, 10], [14, 10, 12]]),
      names: ['GROTTORNA', 'DROPPSTENSGROTTAN', 'DE SJUNGANDE GROTTORNA', 'DJUPGRUVAN', 'MASKGÅNGARNA'] },
    graveyard: { wall: '7', floors: ['floor_grass_dead', 'floor_gravel', 'floor_stone_pattern', 'floor_ground_dirt'], ceil: 'floor_stone', ambient: [0.24, 0.3],
      fog: NIGHT_FOG, names: ['KYRKOGÅRDEN', 'DE GLÖMDAS GRAVFÄLT', 'LIKVAKAN', 'BENÅKERN', 'DE DÖDAS TRÄDGÅRD'] },
    forest: { wall: '6', floors: ['floor_ground_grass', 'floor_ground_dirt', 'floor_mud', 'floor_grass_dead'], ceil: 'floor_wood_planks', ambient: [0.25, 0.32],
      fog: NIGHT_FOG, names: ['DÖDSKOGEN', 'HÄXSKOGEN', 'DIMSKOGEN', 'VARGSKOGEN', 'DE HÄNGDAS LUND'] },
    courtyard: { wall: '1', floors: ['floor_gravel', 'floor_ground_grass', 'floor_stone', 'floor_wood_planks'], ceil: 'floor_wood_planks', ambient: [0.24, 0.3],
      fog: NIGHT_FOG, names: ['BORGGÅRDEN', 'RUINBORGEN', 'KLOSTERGÅRDEN', 'SLOTTSGÅRDEN'] },
    // träsket: floors[0] mossa, [1] spänger (plankor), [2] lera, [3] vissnat gräs; vattnet är tecknet '-' (spelets egen textur)
    swamp: { wall: '0', floors: ['floor_swamp', 'floor_wood_planks', 'floor_mud', 'floor_grass_dead'], ceil: 'floor_wood_planks', ambient: [0.21, 0.27],
      fog: SWAMP_FOG, names: ['TRÄSKET', 'DE DRUNKNADES MOSSE', 'DIMKÄRRET', 'HÄXKÄRRET', 'GUNGFLYET', 'RUTTENMYREN'] },
    // kristallgrottorna (version 8): grottans bygge i kristallvägg; floors[0] kristallgolv, [1] grottberg (fläckar)
    crystal: { wall: 'Ą', biome: 'crystal', floors: ['floor_crystal', 'floor_cave'], ceil: 'ceil_cave', ambient: [0.1, 0.14],
      fog: rng => [rng.int(14, 18), rng.int(10, 13), rng.int(28, 34)], // kall blåviolett
      names: ['KRISTALLGROTTORNA', 'GLITTERSALEN', 'PRISMAGRUVAN', 'AMETISTDJUPET', 'DE SJUNGANDE KRISTALLERNA', 'SKÄRVGÅNGARNA'] },
    // svampriket (version 11): grottans bygge i svampvägg ŝ (glesa glödande svamphattar Ş); floors[0] mossa, [1] grottberg (fläckar)
    fungus: { wall: 'ŝ', biome: 'fungus', floors: ['floor_moss', 'floor_cave'], ceil: 'ceil_cave', ambient: [0.13, 0.18],
      fog: rng => [rng.int(16, 19), rng.int(25, 29), rng.int(20, 24)], // grön-lila sporrök (grönast, med lila skimmer)
      names: ['SVAMPRIKET', 'MYCELDJUPET', 'SPORGROTTORNA', 'DE GLÖDANDE HATTARNA', 'RÖTANS RIKE', 'JÄTTESVAMPARNAS SKOG'] },
  };
  // frostfästet: byggs som fängelsehålan (salar + korridorer i Ø) men med snögårdar under himlen;
  // floors: [0] frusen sten (inomhus), [1] vaktarens golv, [2] snö (gårdarna)
  const FROST_FOG = rng => [rng.int(18, 21), rng.int(23, 26), rng.int(30, 34)]; // kall, blåvit
  const FROST = { id: 'frost', wall: 'Ø', floor: 'floor_frost_stone', snow: 'floor_snow', ceil: 'floor_frost_stone', ambient: [0.2, 0.26],
    fog: FROST_FOG, names: ['FROSTFÄSTET', 'ISTRONENS SAL', 'DE FRUSNA VALVEN', 'VINTERBORGEN', 'SNÖGRAVEN'] };
  // vulkanen: samma bygge som frostfästet (salar + korridorer i obsidian Ò) med askfält under röd himmel i stället för snögårdar;
  // floors: [0] basalt (inomhus), [1] vaktarens golv, [2] aska (fälten)
  const VOLC_FOG = rng => [rng.int(30, 36), rng.int(12, 16), rng.int(8, 11)]; // rödglödande rök
  const VOLCANO = { id: 'volcano', wall: 'Ò', floor: 'floor_basalt', snow: 'floor_ash', ceil: 'floor_basalt', ambient: [0.19, 0.25],
    fog: VOLC_FOG, names: ['ASKFÄSTET', 'DEN BRINNANDE SMEDJAN', 'MAGMAKAMRARNA', 'OBSIDIANHALLARNA', 'ASKFÄLTEN', 'ELDBERGETS HJÄRTA'] };
  // gravkammaren (version 7): samma bygge (salar + korridorer i sandsten È) med öppna gårdar under ökensolen;
  // floors: [0] sand (korridorer, gårdar och vanliga salar), [1] vaktarens golv; gravkamrar och skattkammare målas med guldplattor
  const TOMB_FOG = rng => [rng.int(30, 34), rng.int(24, 28), rng.int(14, 18)]; // varmt sanddis
  const TOMB = { id: 'tomb', wall: 'È', floor: 'floor_sand', snow: 'floor_sand', ceil: 'floor_sand', ambient: [0.22, 0.28],
    fog: TOMB_FOG, names: ['GRAVKAMMAREN', 'DEN SJUNKNA GRAVEN', 'FARAONENS VALV', 'SANDHALLARNA', 'DE GYLLENE KAMRARNA', 'SKARABÉGROTTAN'] };
  // den sjunkna staden (version 8): samma bygge (salar + korridorer i ruinmur Ċ) med översvämmade torg under himlen;
  // floors: [0] sjunkna plattor (salar, korridorer, torg), [1] vaktarens golv; djupt vatten och tidvatten målas av content8
  const SUNKEN_FOG = rng => [rng.int(8, 11), rng.int(18, 22), rng.int(22, 27)]; // grumlig grönblå
  const SUNKEN = { id: 'sunken', wall: 'Ċ', floor: 'floor_sunken_tiles', snow: 'floor_sunken_tiles', ceil: 'floor_stone', ambient: [0.18, 0.24],
    fog: SUNKEN_FOG, names: ['DEN SJUNKNA STADEN', 'DE DRUNKNADES GATOR', 'KORALLTEMPLET', 'TIDVATTENSHAMNEN', 'DEN ÖVERSVÄMMADE KATEDRALEN', 'DJUPETS KVARTER'] };
  const CRYSTAL_FOG = LOOKS.crystal.fog;
  // klocktornet (version 9): fängelsehålans bygge (salar + korridorer, inomhus) i mässingsvägg Ĺ med kuggväggar ĺ;
  // floors: [0] mässing, [1] vaktarens golv; urverk, sågspår, tidsbubblor och klockspel sätts av content9
  const CLOCK_FOG = rng => [rng.int(28, 33), rng.int(21, 25), rng.int(10, 14)]; // varm mässingsdimma
  const CLOCK = { id: 'clock', wall: 'Ĺ', floor: 'floor_brass', snow: 'floor_brass', ceil: 'floor_brass', ambient: [0.16, 0.22], indoor: true,
    fog: CLOCK_FOG, names: ['KLOCKTORNET', 'URVERKET', 'PENDELSALEN', 'KUGGARNAS GÅNGAR', 'TIDENS VALV', 'URMAKARENS VERKSTAD'] };
  // molnborgen (version 9): samma bygge (salar = öar, korridorer = broar) under öppen himmel; väggarna blir tomrum Ń (golv floor_void)
  // utom glesa låga murar och pelare (ļ Ľ), valvens och de hemliga rummens murar och dörrkarmarna (content9); kanten är stormmur Ľ.
  // floors: [0] molngolv, [1] vaktarens golv, sedan floor_void (under Ń) och floor_wind (under vindrutorna ń)
  const SKY_FOG = rng => [rng.int(25, 28), rng.int(30, 33), rng.int(34, 38)]; // ljus blåvit
  const SKY = { id: 'sky', wall: 'ļ', floor: 'floor_cloud', snow: 'floor_cloud', ceil: 'floor_cloud', ambient: [0.26, 0.32],
    fog: SKY_FOG, names: ['MOLNBORGEN', 'STORMENS TINNAR', 'DE SVÄVANDE ÖARNA', 'VINDARNAS RIKE', 'ÅSKANS TRAPPOR', 'HIMMELSBORGEN'] };

  // spegelpalatset (version 11): fängelsehålans bygge (salar + korridorer, inomhus) i marmor Š med spegelväggar š (hela väggsegment i salarna);
  // floors: [0] marmor, [1] vaktarens golv; spegelväggar, teleporterpar och spegelstatyer sätts av content11
  const MIRROR_FOG = rng => [rng.int(24, 27), rng.int(23, 26), rng.int(30, 34)]; // blek silverviolett
  const MIRROR = { id: 'mirror', wall: 'Š', floor: 'floor_marble', snow: 'floor_marble', ceil: 'floor_marble', ambient: [0.2, 0.26], indoor: true,
    fog: MIRROR_FOG, names: ['SPEGELPALATSET', 'DE TUSEN SPEGLARNA', 'MARMORSALARNA', 'GLASKUNGENS HOV', 'ILLUSIONERNAS SAL', 'DEN BRUTNA SPEGELN'] };
  const FUNGUS_FOG = LOOKS.fungus.fog;
  // det förbjudna biblioteket (version 13): fängelsehålans bygge (salar + korridorer, inomhus) i träpanel Ū med bokhyllor ũ (sträckor i väggarna
  // och rader av fristående hyllor i läsesalarna och hyllgångarna); floors: [0] matta, [1] vaktarens golv; pulpeter, ljuskronor och bläckpölar
  // sätts av content13
  const LIBRARY_FOG = rng => [rng.int(22, 26), rng.int(17, 20), rng.int(12, 15)]; // dammig, varm brun
  const LIBRARY = { id: 'library', wall: 'Ū', floor: 'floor_carpet', snow: 'floor_carpet', ceil: 'floor_wood_planks', ambient: [0.14, 0.2], indoor: true,
    fog: LIBRARY_FOG, names: ['DET FÖRBJUDNA BIBLIOTEKET', 'LÄSESALEN', 'DE DAMMIGA GÅNGARNA', 'ARKIVETS DJUP', 'DE TYSTA HYLLORNA', 'BLÄCKETS KAMMARE'] };
  // gjuteriet (version 13): samma bygge i järnplåt ŵ med glesa smältugnar Ŷ; floors: [0] järngaller, [1] vaktarens golv; rullband, kanaler med
  // smält metall, ångventiler, stansar och städ sätts av content13
  const FOUNDRY_FOG = rng => [rng.int(30, 35), rng.int(17, 21), rng.int(10, 13)]; // orangeröd rök
  const FOUNDRY = { id: 'foundry', wall: 'ŵ', floor: 'floor_irongrate', snow: 'floor_irongrate', ceil: 'floor_irongrate', ambient: [0.17, 0.23], indoor: true,
    fog: FOUNDRY_FOG, names: ['GJUTERIET', 'SMÄLTVERKET', 'DE GLÖDANDE HALLARNA', 'STANSARNAS GÅNGAR', 'JÄRNETS HJÄRTA', 'ÅNGANS VERKSTAD'] };
  // blodkatedralen (version 15): fängelsehålans bygge (salar + korridorer, inomhus) i katedralsten Ɗ med ett avlångt långhus; blyinfattade fönster Ƌ
  // och ljusstråk ƍ, blodfuntar, klockor och kyrkbänkar sätts av rumstyperna och content15; floors: [0] svart-röd marmor, [1] vaktarens golv
  const CATHEDRAL_FOG = rng => [rng.int(26, 30), rng.int(9, 12), rng.int(11, 14)]; // mörkröd rökelse
  const CATHEDRAL = { id: 'cathedral', wall: 'Ɗ', floor: 'floor_cathedral', snow: 'floor_cathedral', ceil: 'floor_stone_pattern', ambient: [0.14, 0.2], indoor: true,
    fog: CATHEDRAL_FOG, names: ['BLODKATEDRALEN', 'DET RÖDA LÅNGHUSET', 'MARTYRERNAS KOR', 'DE BLÖDANDE VALVEN', 'KARDINALENS KYRKA', 'KLOCKTORNETS SKUGGA'] };
  // bikupan (version 15): samma bygge i vax Ɠ med sexkantiga celler (rumsformen 'hex'); honungskakor Ɣ i väggarna, honung Ɩ och larvsäckar Ɨ sätts
  // av rumstyperna och content15; floors: [0] vaxgolv, [1] vaktarens golv
  const HIVE_FOG = rng => [rng.int(30, 34), rng.int(21, 25), rng.int(6, 9)]; // varm bärnsten
  const HIVE = { id: 'hive', wall: 'Ɠ', floor: 'floor_hivefloor', snow: 'floor_hivefloor', ceil: 'floor_hivefloor', ambient: [0.16, 0.22], indoor: true,
    fog: HIVE_FOG, names: ['BIKUPAN', 'VAXCELLERNA', 'HONUNGSSALARNA', 'DET SURRANDE DJUPET', 'LARVKAMRARNA', 'DROTTNINGENS KUPA'] };
  // den döda trädgården (version 16): molnborgens bygge under öppen himmel (salar = trädgårdsrum, gårdar = stora gräsmattor, korridorer = häckgångar)
  // med häckar Ɵ som väggar; murade trädgårdar (trädgårdsmur Ơ), fontäner, statyer och taggrankor ƥ sätts av rumstyperna och content16;
  // floors: [0] grus och gräs, [1] vaktarens golv, [2] gräsmatta (gårdarna)
  const GARDEN_FOG = rng => [rng.int(13, 16), rng.int(17, 20), rng.int(15, 18)]; // grågrön skymning
  const GARDEN = { id: 'garden', wall: 'Ɵ', floor: 'floor_garden', snow: 'floor_ground_grass', ceil: 'floor_wood_planks', ambient: [0.24, 0.3],
    fog: GARDEN_FOG, names: ['DEN DÖDA TRÄDGÅRDEN', 'HÄCKARNAS IRRGÅNG', 'DE VISSNA RABATTERNA', 'STATYERNAS PARK', 'TAGGARNAS LUSTGÅRD', 'DEN TYSTA FONTÄNEN'] };
  // drömriket (version 16): fängelsehålans bygge (inomhus) i drömvägg Ƣ; glidande väggar ƣ (level.shifts), sömnens dimma Ʀ, drömlyktor ƪ och
  // falska dörrar Ʃ sätts av rumstyperna och content16; floors: [0] flytande schackruta, [1] vaktarens golv
  const DREAM_FOG = rng => [rng.int(20, 24), rng.int(10, 13), rng.int(28, 33)]; // lila
  const DREAM = { id: 'dream', wall: 'Ƣ', floor: 'floor_dream', snow: 'floor_dream', ceil: 'floor_dream', ambient: [0.15, 0.21], indoor: true,
    fog: DREAM_FOG, names: ['DRÖMRIKET', 'SÖMNENS SALAR', 'DE GLIDANDE VÄGGARNA', 'MARDRÖMMENS SCHACKBRÄDE', 'DET VAKNA ÖGATS HALL', 'JON BLUNDS RIKE'] };

  const roundAmb = (rng, a) => Math.max(a[0], Math.min(a[1], Math.round(rng.range(a[0], a[1]) * 100) / 100));
  const mapSize = (rng, depth) => { const base = 30 + (depth - 1) * 3; return [Math.min(44, base + rng.int(0, 2)), Math.min(44, base + rng.int(0, 2))]; };
  const rowsOf = (W, H, a) => { const out = []; for (let y = 0; y < H; y++) { let s = ''; for (let x = 0; x < W; x++) s += a[y * W + x]; out.push(s); } return out; };

  // ---------- Hjälpstrukturer ----------
  function Heap() { // min-heap med (nyckel, värde)
    const k = [], v = [];
    return {
      key: 0,
      get size() { return k.length; },
      push(key, val) {
        let i = k.length; k.push(key); v.push(val);
        while (i > 0) { const p = (i - 1) >> 1; if (k[p] <= key) break; k[i] = k[p]; v[i] = v[p]; i = p; }
        k[i] = key; v[i] = val;
      },
      pop() {
        const top = v[0]; this.key = k[0];
        const lk = k.pop(), lv = v.pop(), n = k.length;
        if (n > 0) {
          let i = 0;
          for (;;) {
            let c = 2 * i + 1; if (c >= n) break;
            if (c + 1 < n && k[c + 1] < k[c]) c++;
            if (k[c] >= lk) break;
            k[i] = k[c]; v[i] = v[c]; i = c;
          }
          k[i] = lk; v[i] = lv;
        }
        return top;
      },
    };
  }

  // ---------- Fiender (delas av alla biomer) ----------
  // vikter per våning: nya sorter dyker upp ju djupare man kommer
  // nya sorter (version 4): [första djup, vikt(djup)], och vilka biomer de hör hemma i
  const NEW_ENEMIES = {
    U: [1, d => 1.6 + 0.4 * d], X: [1, d => 1.5 + 0.3 * d], Y: [2, d => 0.8 + 0.5 * d], '^': [2, d => 1 + 0.5 * d],
    '+': [2, d => 0.5 + 0.3 * d], '!': [3, d => 0.4 + 0.5 * d], '@': [3, d => 0.4 + 0.5 * d],
    // version 5: Å ghoul, Ä kultist, Ö gargoyle (vilande staty), É isvarg, Ü frostirrbloss
    'Å': [1, d => 1.3 + 0.4 * d], 'Ä': [2, d => 0.8 + 0.5 * d], 'Ö': [2, d => 0.5 + 0.3 * d], 'É': [1, d => 2.2 + 0.5 * d], 'Ü': [2, d => 1.4 + 0.6 * d],
    // version 6: Æ eldelementar (vulkanens egen fiende); Ñ Þ Ð Ý (och Æ utanför vulkanen) byts in efteråt, se FOES6 i content
    'Æ': [2, d => 1.6 + 0.6 * d], 'Ñ': [3, d => 0.3 + 0.2 * d], 'Þ': [1, d => 1], 'Ð': [3, d => 0.4 + 0.3 * d], 'Ý': [2, d => 0.8 + 0.4 * d],
    // version 7: Ã mumie och Ê schakalkrigare (gravkammarens egna); Õ skarabé (grupper), Î tjuv, Ô dubbelgångare och Ã/Ê i andra biomer
    // byts in efteråt, se content7
    'Ã': [1, d => 2.6 + 0.6 * d], 'Ê': [2, d => 1 + 0.5 * d], 'Õ': [1, d => 1], 'Î': [2, d => 0.3], 'Ô': [3, d => 0.3],
    // version 8: Ë golem och Í skärvirrbloss (kristallgrottornas egna), Ï sjöman, Û krabba och Ú siren (sjunkna stadens egna);
    // Ó ål (läggs i vattnet av content8), Ā skuggjägare och Ă häxa byts in efteråt
    'Ë': [1, d => 1.4 + 0.5 * d], 'Í': [1, d => 2 + 0.5 * d], 'Ï': [1, d => 2.4 + 0.5 * d], 'Û': [1, d => 1.8 + 0.4 * d], 'Ú': [2, d => 0.8 + 0.4 * d],
    'Ó': [1, d => 1], 'Ā': [2, d => 0.3], 'Ă': [3, d => 0.3],
    // version 9: ĳ urverkssoldat och ĵ tidsväktare (klocktornets egna), Ķ harpya och ķ stormkallare (molnborgens egna);
    // Ĵ kuggspindel (grupper) och ĸ molnjätte byts in efteråt av content9
    'ĳ': [1, d => 2.2 + 0.5 * d], 'ĵ': [2, d => 0.8 + 0.4 * d], 'Ĵ': [1, d => 1], 'Ķ': [1, d => 2.2 + 0.5 * d], 'ķ': [2, d => 0.9 + 0.4 * d], 'ĸ': [3, d => 0.3],
    // version 10: Ō fångvaktare, ō grävare, Ŏ likgrävare, ŏ rotvätte, Ő armborstskytt, ő paddjätte; alla byts in efteråt av content10
    // (vikterna används inte: de står inte i BIOME_ENEMIES), se FOES10
    'Ō': [1, d => 1], 'ō': [2, d => 1], 'Ŏ': [1, d => 1], 'ŏ': [1, d => 1], 'Ő': [1, d => 1], 'ő': [2, d => 1],
    // version 11: ř svampshaman (svamprikets egen, djup 2+) och Ś spegelriddare (spegelpalatsets egen); ŗ sporling (grupper), Ř mycelbest,
    // ś illusionist och Ŝ glasskärva (grupper) byts in efteråt av content11
    'ř': [2, d => 0.9 + 0.4 * d], 'Ś': [1, d => 2.2 + 0.5 * d], 'ŗ': [1, d => 1], 'Ř': [2, d => 1], 'ś': [2, d => 1], 'Ŝ': [1, d => 1],
    // version 13: ų bläckslem (bibliotekets egen) och ž ångautomat (gjuteriets egen); Ų flygande bok (grupper), Ŵ arkivariespöke, Ž smältgolem
    // och ſ gnistdrönare (grupper) byts in efteråt av content13
    'ų': [1, d => 2.2 + 0.5 * d], 'ž': [1, d => 2.2 + 0.5 * d], 'Ų': [1, d => 1], 'Ŵ': [2, d => 1], 'Ž': [2, d => 1], 'ſ': [1, d => 1],
    // version 14: Ƅ snöfantom, ƅ lavaorm, Ɔ skarabépräst, Ƈ kristallspindel, ƈ marulk, Ɖ vindande; alla byts in efteråt av content14 (FOES14)
    'Ƅ': [1, d => 1], 'ƅ': [2, d => 1], 'Ɔ': [2, d => 1], 'Ƈ': [1, d => 1], 'ƈ': [1, d => 1], 'Ɖ': [2, d => 1],
    // version 15: ƒ botgörare och Ɯ kerub (katedralens egna), ƚ larv (bikupans egen); Ƒ korgosse, Ƙ arbetsbi (svärmar) och ƙ gaddkrigare byts in
    // efteråt av content15
    'ƒ': [1, d => 2.2 + 0.5 * d], 'Ɯ': [1, d => 1.2 + 0.4 * d], 'ƚ': [1, d => 2.2 + 0.5 * d], 'Ƒ': [1, d => 1], 'Ƙ': [1, d => 1], 'ƙ': [2, d => 1],
    // version 16: ƭ trädgårdsdräng (trädgårdens egen), Ʈ drömätare (drömrikets egen); ƫ stenängel, Ƭ taggranka, Ư spegling och ư sömngångare byts in
    // efteråt av content16
    'ƭ': [1, d => 2.2 + 0.5 * d], 'Ʈ': [1, d => 2.2 + 0.5 * d], 'ƫ': [2, d => 1], 'Ƭ': [1, d => 1], 'Ư': [2, d => 1], 'ư': [2, d => 1],
  };
  const BIOME_ENEMIES = { caves: 'UXÜ', forest: 'YUXÉ', graveyard: 'X!^ÅÄÖ', dungeon: '@!U+ÅÄÖ', courtyard: '@Y!ÄÖ', swamp: '^UYXÅ', frost: 'ÉÜ@', volcano: 'YXÆ!',
    tomb: 'ÃÊX', crystal: 'ËÍX', sunken: 'ÏÛÚ', clock: 'ĳĵ', sky: 'Ķķ', fungus: 'ř^U', mirror: 'Ś@', library: 'ųX', foundry: 'žÆ',
    cathedral: 'ƒƜ', hive: 'ƚ', garden: 'ƭX', dream: 'Ʈ' }; // version 15/16
  const enemyTypes = (depth, biome) => [['S', Math.max(4, 10 - depth)], ['K', 3 + 1.2 * depth], ['V', depth >= 2 ? 1.5 + 1.5 * (depth - 1) : 0],
    ['L', 2 + 0.5 * depth], ['I', depth >= 2 ? 1 + depth : 0], ['O', depth >= 2 ? 0.8 + 0.4 * depth : 0],
    ['N', depth >= 3 ? 0.5 + 0.5 * depth : 0], ['R', depth >= 3 ? 1 + 0.5 * depth : 0], ['W', depth >= 3 ? 0.6 + 0.6 * depth : 0]]
    .concat([...(BIOME_ENEMIES[biome] || '')].map(c => [c, depth >= NEW_ENEMIES[c][0] ? NEW_ENEMIES[c][1](depth) * ((biome === 'frost' && c !== '@') || (biome === 'volcano' && c === 'Æ') || (biome === 'tomb' && c !== 'X') || (biome === 'crystal' && c !== 'X') || biome === 'sunken' || biome === 'clock' || biome === 'sky' || (biome === 'fungus' && c !== 'U') || (biome === 'mirror' && c === 'Ś') || (biome === 'library' && c === 'ų') || (biome === 'foundry' && c === 'ž')
      || (biome === 'cathedral' && c === 'ƒ') || biome === 'hive' || (biome === 'garden' && c === 'ƭ') || biome === 'dream' ? 2 : 1) : 0]));

  // ---------- Rumstyper (arketyper) ----------
  // mix: fiendesorter som trivs här (vikt x3), floor: golvtextur inomhus (paint: även utomhus/i grottan),
  // min: minsta antal rutor, fill(r, F): möblering med hjälpfunktionerna i content
  const ARCH = {
    // --- inomhus: fängelsehålan och borggårdens längor ---
    library: { mix: 'NKS', floor: 'floor_wood_planks', min: 16, fill(r, F) {
      F.shelves(r, 'q', 3 + Math.floor(r.cells.length / 12));
      F.place(r, 'J', F.int(1, 2), { open: true, center: true, spread: 2 });
      F.place(r, 'c', F.int(1, 2), { wall: true, spread: 4 });
    } },
    storeroom: { mix: 'RLS', floor: 'floor_wood_planks', min: 9, fill(r, F) {
      for (const p of F.place(r, 'T', F.int(1, 2), { corner: true, spread: 3 })) F.place(r, 'T', F.int(1, 2), { near: [p[0], p[1], 1.5] });
      F.place(r, 'T', F.int(0, 2), { wall: true });
      F.place(r, 'o', F.int(1, 2), { wall: true });
      F.chest(r, 0.35);
    } },
    ossuary: { mix: 'SNK', floor: 'floor_stone_pattern', min: 12, fill(r, F) {
      F.place(r, 'j', F.int(4, 7), { spread: 2 });
      F.place(r, 'k', F.int(1, 2), { wall: true, spread: 3 });
      F.place(r, 'c', 1, { wall: true });
    } },
    prison: { mix: 'WOS', min: 12, fill(r, F) {
      F.place(r, 'v', F.int(2, 4), { wall: true, spread: 2 });
      F.place(r, 'z', F.int(1, 2), { strict: true, spread: 3 });
      F.place(r, 'j', F.int(1, 2), {});
    } },
    chapel: { mix: 'VNI', floor: 'floor_tiles_blue', min: 16, fill(r, F) {
      const f = F.focal(r);
      F.place(r, 'c', F.int(2, 3), f ? { near: [f[0], f[1], 2.5] } : { wall: true });
      F.place(r, 'k', F.int(0, 1), { wall: true });
      if (r.cells.length >= 30) F.row(r, 'J', F.int(2, 4), true); // bänkrader
    } },
    dining: { mix: 'WOV', floor: 'floor_wood_planks', min: 20, fill(r, F) {
      F.row(r, 'J', F.int(3, 6));
      F.place(r, 'c', F.int(1, 2), { wall: true, spread: 4 });
      F.place(r, 'o', 1, { wall: true });
    } },
    armory: { mix: 'WSK', min: 12, fill(r, F) {
      F.place(r, 'H', F.int(2, 5), { wall: true, spread: 2 });
      F.place(r, 'T', F.int(1, 2), { corner: true });
      F.place(r, F.chance(0.25) ? 'A' : 'a', 1, { wall: true });
      F.chest(r, 0.2);
    } },
    torture: { mix: 'IVL', floor: 'floor_stone', min: 12, fill(r, F) {
      F.place(r, 'v', F.int(1, 2), { wall: true, spread: 3 });
      F.place(r, 'z', F.int(1, 3), { strict: true, spread: 2 });
      F.place(r, 'j', F.int(2, 3), {});
      F.place(r, 'c', 1, { wall: true });
    } },
    crypt: { mix: 'SKV', floor: 'floor_stone_pattern', min: 9, fill(r, F) {
      if (!F.grid(r, 'k', F.int(2, 6)).length) F.place(r, 'k', F.int(1, 2), { wall: true, spread: 2 });
      F.place(r, 'c', 2, { wall: true, spread: 3 });
      F.place(r, 'j', F.int(1, 2), {});
      F.chest(r, 0.2);
    } },
    frozen: { mix: 'SKN', floor: 'floor_tiles_blue', min: 12, fill(r, F) { // frusen sal/krypta: isgolv
      F.place(r, 'u', F.int(1, 2), { wall: true, spread: 3 });
      F.place(r, 'k', F.int(0, 2), { wall: true, spread: 2 });
      F.place(r, 'c', 1, { wall: true });
    }, hazard(r, Z) { Z.blob(r, ':', Z.range(0.6, 0.9)); } },
    flooded: { mix: 'LSU', floor: 'floor_stone', min: 12, fill(r, F) { // översvämmad sal
      F.place(r, 'T', F.int(1, 2), { corner: true, spread: 2 });
      F.place(r, 'j', F.int(1, 2), {});
    }, hazard(r, Z) { Z.blob(r, '-', Z.range(0.5, 0.8)); } },
    trap: { mix: 'SKR', min: 9, fits: r => Math.min(r.box.w, r.box.h) <= 5 || Math.max(r.box.w, r.box.h) >= 1.6 * Math.min(r.box.w, r.box.h),
      fill(r, F) { // fällgång: pilplattor, statyer som skjuter
        F.place(r, 'u', F.int(1, 2), { wall: true, spread: 3 });
        F.place(r, 'j', F.int(1, 3), { spread: 2 });
      }, hazard(r, Z) { Z.traps(r, '<', Z.int(2, 3)); } },
    gas: { mix: 'L!K', min: 12, fill(r, F) { // gaskammare med ventiler i golvet
      F.place(r, 'T', F.int(1, 2), { corner: true });
      F.place(r, 'j', F.int(1, 2), {});
      F.place(r, 'v', F.int(0, 1), { wall: true });
    }, hazard(r, Z) { Z.traps(r, '>', Z.int(2, 3)); } },
    // --- grottor ---
    grotto: { mix: 'ILK', min: 12, fill(r, F) { // kristallgrotta: kluster av glödande kristaller längs väggarna
      for (let k = F.int(2, 3); k > 0; k--) {
        const s = F.place(r, 'i', 1, { wall: true, avoid: ['i', 4] })[0];
        if (s) F.place(r, 'i', F.int(1, 3), { near: [s[0], s[1], 1.6] });
      }
    } },
    mushroom: { mix: 'LOS', min: 10, fill(r, F) { // svampgrotta
      for (let k = F.int(2, 3); k > 0; k--) {
        const s = F.place(r, 'F', 1, { avoid: ['F', 3] })[0];
        if (s) F.place(r, 'F', F.int(1, 3), { near: [s[0], s[1], 1.6] });
      }
    } },
    boneden: { mix: 'SWR', min: 10, fill(r, F) { // benlya
      F.place(r, 'j', F.int(4, 8), { spread: 1 });
      F.place(r, 'v', F.int(1, 2), { wall: true, spread: 3 });
      F.place(r, 'k', F.int(0, 1), { wall: true });
    } },
    mudflat: { mix: 'LS', floor: 'floor_mud', paint: true, min: 10, fill(r, F) { // översvämmad lerslätt
      F.place(r, 'j', F.int(1, 2), {});
      F.place(r, 'F', F.int(1, 2), { wall: true, spread: 3 });
    }, hazard(r, Z) { Z.blob(r, '-', Z.range(0.1, 0.22)); } },
    lava: { mix: 'IKX', min: 20, fill(r, F) { // lavaflod/-göl med en bro av golv (lavan går alltid att gå runt)
      F.place(r, 'i', F.int(1, 2), { wall: true, spread: 3 });
      F.place(r, 'j', F.int(1, 2), {});
    }, hazard(r, Z) { Z.river(r, '_'); Z.pool(r, '_', Z.range(1.5, 2.6)); if (Z.chance(0.5)) Z.pool(r, '_', Z.range(1.2, 2)); } },
    nest: { mix: 'UUX', force: 'U', min: 12, fill(r, F) { // spindelbo: väv i hörnen och längs väggarna, spindlar
      F.place(r, 'j', F.int(2, 4), { spread: 2 });
      F.place(r, 'v', F.int(0, 1), { wall: true });
    }, hazard(r, Z) { Z.blob(r, '"', Z.range(0.18, 0.3), { walls: true, max: Z.int(8, 14) }); } },
    camp: { mix: 'ROW', min: 12, fill(r, F) { // jägar-/orchläger kring en lägereld (som specialrum: viloplats med lägereld ¶, se restSite)
      if (r.type === 'special') { F.restSite(r); return; }
      const f = F.place(r, 'f', 1, { open: true, center: true, jit: 3 })[0];
      F.place(r, 'T', F.int(2, 3), f ? { near: [f[0], f[1], 3.5], spread: 2 } : { wall: true });
      F.place(r, 'J', 1, f ? { near: [f[0], f[1], 3] } : {});
      F.place(r, 'H', F.int(0, 1), { wall: true });
      F.chest(r, 0.25);
    } },
    // --- kyrkogård ---
    graves: { mix: 'SR', min: 12, fill(r, F) { // öppnade gravar med likkistor
      for (const p of F.place(r, 'k', F.int(2, 4), { open: true, spread: 3 })) F.place(r, 'j', 1, { near: [p[0], p[1], 1.5] });
      F.place(r, 'c', F.int(1, 2), { pred: F.nextTo('n') });
    } },
    statues: { mix: 'NK', min: 12, fill(r, F) {
      for (const p of F.place(r, 'u', F.int(2, 4), { open: true, spread: 3 })) if (F.chance(0.5)) F.place(r, 'c', 1, { near: [p[0], p[1], 1.5] });
    } },
    candles: { mix: 'VN', min: 8, fill(r, F) { // levande ljus vid gravarna
      if (F.place(r, 'c', F.int(4, 7), { pred: F.nextTo('n'), spread: 2 }).length < 2) F.place(r, 'c', 2, { spread: 3 });
      F.place(r, 'j', 1, {});
    } },
    bonefield: { mix: 'SW', min: 10, fill(r, F) {
      F.place(r, 'j', F.int(4, 7), { spread: 2 });
      F.place(r, 'v', 1, {});
      F.place(r, 'k', 1, { open: true });
    } },
    // --- skog ---
    mushring: { mix: 'IOL', min: 12, fill(r, F) { // häxring av lysande svampar
      if (F.ring(r, 'F', F.int(2, 3), 8).length < 3) F.place(r, 'F', F.int(3, 5), { spread: 2 });
      F.place(r, 'j', 1, {});
    } },
    boneclear: { mix: 'WS', min: 10, fill(r, F) { // benströdd glänta
      F.place(r, 'j', F.int(4, 8), { spread: 1 });
      F.place(r, 'k', F.int(0, 1), {});
      F.place(r, 'v', F.int(0, 1), {});
    } },
    cages: { mix: 'VS', min: 10, fill(r, F) { // burar med offer
      F.place(r, 'v', F.int(2, 3), { spread: 2 });
      F.place(r, 'j', 2, {});
    } },
    thicket: { mix: 'SLR', fill(r, F) { // stigar och snår
      F.place(r, 'F', F.int(1, 3), { avoid: ['F', 3] });
      F.place(r, 'j', F.int(1, 2), { spread: 3 });
    } },
    hut: { mix: 'RO', fill(r, F) { // jägarstuga
      F.place(r, 'J', 1, { open: true, center: true });
      F.place(r, 'T', F.int(1, 2), { corner: true });
      F.place(r, 'c', 1, { wall: true });
    } },
    // --- borggård ---
    market: { mix: 'RWO', min: 20, fill(r, F) { // marknadsstånd: bord och lådor
      F.stalls(r, F.int(2, 4));
      F.place(r, 'c', 1, { pred: F.nextTo('J') });
    } },
    drill: { mix: 'WS', min: 12, fill(r, F) { // exercisplats med vapenställ
      F.place(r, 'H', F.int(2, 4), { spread: 2 });
      F.place(r, 'T', F.int(1, 2), {});
    } },
    fountain: { mix: 'VK', floor: 'floor_stone', paint: true, fill(r, F) { // gårdens fontän: staty med ljus runt om
      F.putAt(r.cx, r.cy, 'u');
      for (const [dx, dy] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) F.putAt(r.cx + dx, r.cy + dy, 'c');
    } },
    // --- träsk ---
    bog: { mix: '^LS', min: 12, fill(r, F) { // gungfly: mest vatten, svampar på tuvorna
      for (let k = F.int(1, 2); k > 0; k--) {
        const s = F.place(r, 'F', 1, { avoid: ['F', 3] })[0];
        if (s) F.place(r, 'F', F.int(1, 2), { near: [s[0], s[1], 1.6] });
      }
      F.place(r, 'j', F.int(1, 2), {});
    }, hazard(r, Z) { Z.blob(r, '-', Z.range(0.35, 0.55)); } },
    sunkenshrine: { mix: 'V^N', min: 14, fill(r, F) { // sjunken helgedom: staty på en ö med ljus, vatten runt om
      const f = F.place(r, 'u', 1, { open: true, center: true, jit: 1.5 })[0];
      if (f) { F.place(r, 'c', F.int(2, 4), { near: [f[0], f[1], 2.2], spread: 1 }); r.focus = f; } else F.place(r, 'c', 2, { spread: 3 });
      F.place(r, 'k', F.int(0, 1), {});
    }, hazard(r, Z) { if (r.focus) Z.ringAt(r, '-', r.focus, 2.4, 3.6); Z.blob(r, '-', 0.12); } },
    // --- frostfästet ---
    throne: { mix: 'ÜVN', floor: 'floor_tiles_blue', min: 20, fill(r, F) { // istronens sal: tronen (staty) vid väggen med ljus, statyer längs väggarna
      const f = F.place(r, 'u', 1, { wall: true, center: true, jit: 1.5 })[0];
      F.place(r, 'c', F.int(2, 3), f ? { near: [f[0], f[1], 2.5], spread: 1 } : { wall: true, spread: 3 });
      F.place(r, 'u', F.int(2, 3), { wall: true, spread: 3, avoid: ['u', 2] });
      F.place(r, 'c', F.int(0, 2), { wall: true, spread: 4 });
    }, hazard(r, Z) { if (Z.chance(0.5)) Z.blob(r, ':', Z.range(0.1, 0.2)); } },
    frozenlake: { mix: 'ÉSK', min: 20, fill(r, F) { // frusen sjö: stort isfält, en staty och några kristaller vid stranden
      F.place(r, 'u', F.int(0, 1), { wall: true });
      F.place(r, 'i', F.int(1, 2), { wall: true, spread: 3 });
      F.place(r, 'j', F.int(1, 2), {});
    }, hazard(r, Z) { Z.blob(r, ':', Z.range(0.45, 0.7)); } },
    barracks: { mix: 'É@W', floor: 'floor_wood_planks', min: 12, fill(r, F) { // kasern: vapenställ, britsar/bord, lådor, ammo
      F.place(r, 'H', F.int(2, 4), { wall: true, spread: 2 });
      if (!F.row(r, 'J', F.int(2, 4), true).length) F.place(r, 'J', F.int(1, 2), { wall: true, spread: 2 });
      F.place(r, 'T', F.int(1, 2), { corner: true, spread: 2 });
      F.place(r, 'a', 1, { wall: true });
      F.chest(r, 0.2);
    } },
    crystalhall: { mix: 'ÜIK', min: 14, fill(r, F) { // kristallsal: kluster av iskristaller längs väggarna
      for (let k = F.int(2, 4); k > 0; k--) {
        const s = F.place(r, 'i', 1, { wall: true, avoid: ['i', 3] })[0];
        if (s) F.place(r, 'i', F.int(1, 2), { near: [s[0], s[1], 1.6] });
      }
      F.place(r, 'u', F.int(0, 1), { wall: true });
    }, hazard(r, Z) { if (Z.chance(0.4)) Z.blob(r, ':', Z.range(0.08, 0.16)); } },
    // --- vulkanen ---
    forge: { mix: 'Æ@W', min: 12, fill(r, F) { // smedjehall: eldgropar, vapenställ, bord, lådor och ibland ett städ
      F.place(r, 'f', F.int(1, 2), { wall: true, spread: 3 });
      F.place(r, 'H', F.int(1, 3), { wall: true, spread: 2 });
      F.place(r, 'J', F.int(1, 2), { open: true, center: true, spread: 2 });
      F.place(r, 'T', F.int(1, 2), { corner: true, spread: 2 });
      if (F.chance(0.35)) F.place(r, '(', 1, { wall: true });
    }, hazard(r, Z) { if (Z.chance(0.4)) Z.pool(r, '_', Z.range(1, 1.5)); } },
    lavalake: { mix: 'ÆXK', min: 24, fits: r => r.box.w >= 6 && r.box.h >= 6, fill(r, F) { // lavasjö med en bro tvärs över
      F.place(r, 'i', F.int(1, 2), { wall: true, spread: 3 });
      F.place(r, 'j', F.int(0, 2), {});
    }, hazard(r, Z) { Z.lake(r, '_'); } },
    ashfield: { mix: 'YÆX', min: 12, fill(r, F) { // askfält under röd himmel: förkolnade träd, ben, en lavaflod med broar
      F.place(r, 'j', F.int(2, 4), { spread: 2 });
      F.place(r, 't', F.int(0, 2), { spread: 3 });
      F.place(r, 'i', F.int(0, 1), { wall: true });
    }, hazard(r, Z) { Z.river(r, '_'); if (Z.chance(0.5)) Z.pool(r, '_', Z.range(1.2, 2.2)); } },
    magmachamber: { mix: 'ÆIK', min: 14, fill(r, F) { // magmakammare: kluster av glödande kristaller, lavagölar
      for (let k = F.int(2, 3); k > 0; k--) {
        const s = F.place(r, 'i', 1, { wall: true, avoid: ['i', 3] })[0];
        if (s) F.place(r, 'i', F.int(1, 2), { near: [s[0], s[1], 1.6] });
      }
    }, hazard(r, Z) { Z.pool(r, '_', Z.range(1.3, 2.2)); if (Z.chance(0.6)) Z.pool(r, '_', Z.range(1, 1.8)); } },
    // --- gravkammaren (version 7; kvicksanden ¯ läggs av content7) ---
    burialchamber: { mix: 'ÃÃS', floor: 'floor_gold_tiles', min: 12, fill(r, F) { // gravkammare: sarkofager längs väggarna, guldhögar, statyer, ljus
      F.place(r, '²', F.int(1, 3), { wall: true, spread: 3 });
      F.place(r, 'u', F.int(1, 2), { wall: true, spread: 3, avoid: ['u', 2] });
      F.place(r, '$', F.int(0, 2), { spread: 2 });
      F.place(r, 'c', F.int(1, 2), { wall: true, spread: 3 });
    } },
    pillarhall: { mix: 'ÊÃK', min: 16, fits: r => r.box.w >= 5 && r.box.h >= 5 && r.box.w * r.box.h >= 30, fill(r, F) { // pelarsal: rader av sandstenspelare, ljus vid väggarna
      F.pillars(r, 'È');
      F.place(r, 'c', F.int(1, 2), { wall: true, spread: 3 });
      F.place(r, 'u', F.int(0, 1), { wall: true });
    } },
    treasury: { mix: 'ÃÊS', floor: 'floor_gold_tiles', min: 12, fill(r, F) { // skattkammare: guld, krukor, statyer och en förbannad kista
      F.place(r, '$', F.int(1, 3), { spread: 2 });
      F.place(r, 'o', F.int(1, 2), { wall: true });
      F.place(r, 'u', F.int(1, 2), { wall: true, spread: 3 });
      F.chest(r, 0.75);
      F.place(r, 'c', 1, { wall: true });
    } },
    sandtunnel: { mix: 'ÊXS', min: 9, fits: r => Math.min(r.box.w, r.box.h) <= 5 || Math.max(r.box.w, r.box.h) >= 1.6 * Math.min(r.box.w, r.box.h),
      fill(r, F) { // sandgång: ben och lådor i sanden, fläckar av kvicksand (content7)
        F.place(r, 'j', F.int(1, 3), { spread: 2 });
        F.place(r, 'T', F.int(0, 1), { corner: true });
        F.place(r, 'c', F.int(0, 1), { wall: true });
      } },
    sandcourt: { mix: 'ÊÃX', min: 12, fill(r, F) { // gård under ökensolen: obelisker, palmer och ben (kvicksand av content7)
      F.place(r, 'u', F.int(1, 3), { open: true, spread: 3 });
      F.place(r, 't', F.int(0, 2), { spread: 3 });
      F.place(r, 'j', F.int(1, 2), {});
    } },
    // --- kristallgrottorna (version 8; brytande kristaller, spikfläckar, glödkristaller och ådror läggs även av content8) ---
    geode: { mix: 'ÍËK', min: 12, fill(r, F) { // geod: kluster av glödande kristaller längs väggarna och en glödkristall
      for (let k = F.int(2, 3); k > 0; k--) {
        const s = F.place(r, 'i', 1, { wall: true, avoid: ['i', 3] })[0];
        if (s) F.place(r, 'i', F.int(1, 2), { near: [s[0], s[1], 1.6] });
      }
      F.place(r, 'Ę', 1, { wall: true });
    } },
    prismhall: { mix: 'ËÍS', min: 30, fill(r, F) { // prismasal: glödkristaller vid väggarna, kristallsplitter och ben (brytande kristaller av content8)
      F.place(r, 'Ę', F.int(1, 2), { wall: true, spread: 4 });
      F.place(r, 'i', F.int(1, 3), { wall: true, spread: 2 });
      F.place(r, 'j', F.int(1, 2), {});
    } },
    shardfield: { mix: 'ÍXK', min: 14, fill(r, F) { // skärvfält: ben och kristallsplitter (spikfläckarna lägger content8 helst här)
      F.place(r, 'j', F.int(2, 3), { spread: 2 });
      F.place(r, 'i', F.int(1, 2), { wall: true });
    } },
    // --- den sjunkna staden (version 8; tidvatten, kanaler i korridorerna, luftbubblor, ålar och vrakkistor läggs av content8) ---
    cistern: { mix: 'ÏÛS', min: 24, fits: r => r.box.w >= 6 && r.box.h >= 6, fill(r, F) { // cistern: en bassäng med en gångbro tvärs över
      F.place(r, 'u', F.int(0, 1), { wall: true });
      F.place(r, 'j', F.int(1, 2), {});
    }, hazard(r, Z) { Z.lake(r, 'Đ'); } },
    drownedhall: { mix: 'ÏÚK', min: 20, fits: r => r.box.w >= 5 && r.box.h >= 5 && r.box.w * r.box.h >= 30, fill(r, F) { // översvämmad pelarsal med en kanal
      F.pillars(r, 'Ċ');
      F.place(r, 'c', F.int(1, 2), { wall: true, spread: 3 });
    }, hazard(r, Z) { Z.river(r, 'Đ'); } },
    wreckhall: { mix: 'ÏÛW', min: 12, fill(r, F) { // vraksal: lådor, ben och bråte (vrakkistan lägger content8 helst här)
      for (const p of F.place(r, 'T', F.int(1, 2), { corner: true, spread: 3 })) F.place(r, 'T', F.int(0, 1), { near: [p[0], p[1], 1.5] });
      F.place(r, 'j', F.int(1, 3), { spread: 2 });
    }, hazard(r, Z) { if (Z.chance(0.5)) Z.pool(r, 'Đ', Z.range(1.2, 2)); } },
    coralgrotto: { mix: 'ÛÚS', min: 12, fill(r, F) { // korallgrotta: lysande alger i klungor, en staty, en göl
      for (let k = F.int(1, 2); k > 0; k--) {
        const s = F.place(r, 'F', 1, { avoid: ['F', 3] })[0];
        if (s) F.place(r, 'F', F.int(1, 2), { near: [s[0], s[1], 1.6] });
      }
      F.place(r, 'u', F.int(0, 1), { wall: true });
    }, hazard(r, Z) { Z.pool(r, 'Đ', Z.range(1.4, 2.2)); } },
    plaza: { mix: 'ÏÚÛ', min: 20, fill(r, F) { // översvämmat torg under himlen: brutna statyer och bråte; en bassäng med bro eller en kanal
      F.place(r, 'u', F.int(1, 2), { open: true, spread: 3 });
      F.place(r, 'j', F.int(1, 2), {});
    }, hazard(r, Z) { if (r.box.w >= 7 && r.box.h >= 7 && Z.chance(0.6)) Z.lake(r, 'Đ'); else { Z.river(r, 'Đ'); Z.pool(r, 'Đ', Z.range(1.4, 2.2)); } } },
    // --- version 9: klocktornet (urverk Ņ blockerar som rekvisita) ---
    gearworks: { mix: 'ĳĵK', min: 12, fill(r, F) { // urverkshall: urverk längs väggarna, lådor och ljus
      F.place(r, 'Ņ', F.int(2, 3), { wall: true, spread: 3 });
      F.place(r, 'T', F.int(0, 2), { corner: true, spread: 2 });
      F.place(r, 'c', 1, { wall: true });
    } },
    pendulumhall: { mix: 'ĳĵS', min: 16, fits: r => r.box.w >= 5 && r.box.h >= 5 && r.box.w * r.box.h >= 30, fill(r, F) { // pendelsal: rader av mässingspelare
      F.pillars(r, 'Ĺ');
      F.place(r, 'Ņ', 1, { wall: true });
      F.place(r, 'c', F.int(1, 2), { wall: true, spread: 3 });
    } },
    workshop: { mix: 'ĳKR', floor: 'floor_wood_planks', min: 12, fill(r, F) { // urmakarens verkstad: bord, vapenställ, lådor och ett urverk
      if (!F.row(r, 'J', F.int(2, 4), true).length) F.place(r, 'J', F.int(1, 2), { spread: 2 });
      F.place(r, 'H', F.int(1, 2), { wall: true, spread: 2 });
      F.place(r, 'T', F.int(1, 2), { corner: true });
      F.place(r, 'Ņ', 1, { wall: true });
    } },
    // --- version 9: molnborgen (öarna; blixtstänger ņ blockerar som rekvisita) ---
    cloudisle: { mix: 'ĶķK', min: 9, fill(r, F) { // molnö: statyer och ben
      F.place(r, 'u', F.int(1, 2), { open: true, spread: 3 });
      F.place(r, 'j', F.int(0, 2), {});
    } },
    harpynest: { mix: 'ĶS', min: 9, fill(r, F) { // harpyrede: benhögar och bråte
      F.place(r, 'j', F.int(3, 5), {});
      F.place(r, 'T', F.int(0, 1), { corner: true });
    } },
    stormspire: { mix: 'ķĶW', min: 12, fill(r, F) { // stormspira: en blixtstång mitt på ön, en staty och ett ljus
      F.place(r, 'ņ', 1, { open: true, center: true, jit: 2 });
      F.place(r, 'u', F.int(0, 1), {});
      F.place(r, 'c', 1, {});
    } },
    cloudcourt: { mix: 'ĶķK', min: 20, fill(r, F) { // molngård (de stora öarna): statyer, en blixtstång, ben
      F.place(r, 'u', F.int(2, 3), { open: true, spread: 3 });
      F.place(r, 'ņ', F.int(0, 1), { open: true, spread: 4 });
      F.place(r, 'j', F.int(1, 2), {});
    } },
    // --- version 11: svampriket (glödsvampar Ŧ blockerar som rekvisita och lyser) ---
    sporegrotto: { mix: 'ř^K', min: 10, fill(r, F) { // sporgrotta: klungor av glödsvampar och lysande svamp
      for (let k = F.int(1, 2); k > 0; k--) {
        const s = F.place(r, 'Ŧ', 1, { wall: true, avoid: ['Ŧ', 3] })[0];
        if (s) F.place(r, 'F', F.int(1, 3), { near: [s[0], s[1], 1.8] });
      }
    } },
    giantcaps: { mix: '^ŘS', min: 20, fits: r => r.box.w >= 5 && r.box.h >= 5, fill(r, F) { // jättesvampar: fristående stjälkar av glödande svamphatt
      F.place(r, 'Ş', F.int(1, 3), { open: true, spread: 3, avoid: ['Ş', 2] });
      F.place(r, 'F', F.int(1, 2), {});
    } },
    myceliumden: { mix: 'U^L', min: 9, fill(r, F) { // mycelnäste: ben och bråte insnärjda i mycel, en glödsvamp
      F.place(r, 'j', F.int(2, 3), { spread: 2 });
      F.place(r, 'Ŧ', 1, { wall: true });
      F.place(r, 'T', F.int(0, 1), { corner: true });
    } },
    // --- version 11: spegelpalatset (spegelstatyer ŧ blockerar som rekvisita) ---
    mirrorhall: { mix: 'ŚKS', min: 12, fill(r, F) { // spegelsal: spegelstatyer längs väggarna och kandelabrar
      F.place(r, 'ŧ', F.int(1, 2), { wall: true, spread: 3 });
      F.place(r, 'c', F.int(1, 2), { wall: true, spread: 3 });
    } },
    ballroom: { mix: 'Ś@S', min: 16, fits: r => r.box.w >= 5 && r.box.h >= 5 && r.box.w * r.box.h >= 30, fill(r, F) { // balsal: rader av marmorpelare
      F.pillars(r, 'Š');
      F.place(r, 'c', F.int(1, 2), { wall: true, spread: 3 });
      F.place(r, 'ŧ', F.int(0, 1), { wall: true });
    } },
    gallery: { mix: 'ŚKN', floor: 'floor_wood_planks', min: 12, fill(r, F) { // konstgalleri: statyer, en spegelstaty och ett bord
      F.place(r, 'u', F.int(1, 3), { wall: true, spread: 2 });
      F.place(r, 'ŧ', 1, { wall: true });
      F.place(r, 'J', F.int(0, 1), { open: true });
    } },
    // --- version 13: det förbjudna biblioteket (bokhyllor ũ är väggar: rader av fristående hyllor med luckor, se F.stacks) ---
    readingroom: { mix: 'ųXK', min: 20, fits: r => r.box.w >= 5 && r.box.h >= 5, fill(r, F) { // läsesal: hyllrader, ett läsbord och ljus
      F.stacks(r, 'ũ', 0.85);
      F.place(r, 'J', F.int(1, 2), { open: true, center: true, spread: 3 });
      F.place(r, 'c', F.int(1, 2), { wall: true, spread: 4 });
    } },
    stacks: { mix: 'ųSK', min: 16, fits: r => r.box.w >= 5 && r.box.h >= 5, fill(r, F) { // hyllgångar: täta hyllrader, ett ljus och lösa böcker (ben)
      F.stacks(r, 'ũ', 1);
      F.place(r, 'c', 1, { wall: true });
      F.place(r, 'j', F.int(0, 1), {});
    } },
    scriptorium: { mix: 'ųNK', floor: 'floor_wood_planks', min: 12, fill(r, F) { // skrivarsal: skrivpulpeter (bord) i rader, hyllor längs väggarna
      if (!F.row(r, 'J', F.int(2, 4), true).length) F.place(r, 'J', F.int(1, 2), { spread: 2 });
      F.shelves(r, 'q', 2 + Math.floor(r.cells.length / 20));
      F.place(r, 'c', F.int(1, 2), { wall: true, spread: 3 });
    } },
    archive: { mix: 'ųSL', min: 9, fill(r, F) { // arkivet: ibland hyllrader, lådor med handlingar, hyllor och en kista
      F.stacks(r, 'ũ', 0.5);
      F.shelves(r, 'q', 2 + Math.floor(r.cells.length / 16));
      for (const p of F.place(r, 'T', F.int(1, 2), { corner: true, spread: 3 })) F.place(r, 'T', F.int(0, 1), { near: [p[0], p[1], 1.5] });
      F.chest(r, 0.3);
    } },
    // --- version 13: gjuteriet (städ/gjutformar ż blockerar som rekvisita; rullband, kanaler, ventiler och stansar sätts av content13) ---
    smeltery: { mix: 'žÆK', min: 12, fill(r, F) { // smältverk: ibland en kanal med smält metall, eldgropar, gjutformar och lådor
      if (F.chance(0.5)) F.canal(r, 'Ź');
      F.place(r, 'f', F.int(1, 2), { wall: true, spread: 3 });
      F.place(r, 'ż', F.int(1, 2), { wall: true, spread: 3 });
      F.place(r, 'T', F.int(1, 2), { corner: true, spread: 2 });
    } },
    beltworks: { mix: 'žKS', min: 16, fill(r, F) { // rullbandshall: arbetsbord och lådor (banden läggs av content13)
      F.place(r, 'J', F.int(1, 2), { wall: true, spread: 3 });
      F.place(r, 'T', F.int(1, 3), { corner: true, spread: 2 });
    } },
    casting: { mix: 'žÆW', min: 16, fits: r => r.box.w >= 5 && r.box.h >= 5, fill(r, F) { // gjuthall: en kanal med smält metall, gjutformar och ett vapenställ
      F.canal(r, 'Ź');
      F.place(r, 'ż', F.int(1, 3), { wall: true, spread: 2 });
      F.place(r, 'H', F.int(0, 1), { wall: true });
      F.place(r, 'c', F.int(0, 1), { wall: true });
    } },
    pressroom: { mix: 'žRK', min: 12, fill(r, F) { // presshall: vapenställ, lådor och en gjutform
      F.place(r, 'H', F.int(1, 2), { wall: true, spread: 2 });
      F.place(r, 'T', F.int(1, 2), { corner: true, spread: 2 });
      F.place(r, 'ż', F.int(0, 1), { wall: true });
    } },
    // --- version 15: blodkatedralen (kyrkbänkar Ǝ, blodfuntar Ə, klockor Ɛ; blyinfattade fönster Ƌ och ljusstråk ƍ sätts av content15) ---
    nave: { mix: 'ƒƜK', min: 40, fits: r => !!r.nave, fill(r, F) { // långhus: bänkrader tvärs över salen, mittgång med röd matta, kor med altare och ljus
      F.pews(r);
      F.place(r, 'c', F.int(1, 2), { wall: true, spread: 4 });
    } },
    baptistery: { mix: 'ƒƜV', min: 12, fill(r, F) { // dopkapell: en blodfunt i mitten, ljus runt den och en bänk
      const f = F.place(r, 'Ə', 1, { open: true, center: true, jit: 1.2 })[0] || F.place(r, 'Ə', 1, { center: true })[0];
      F.place(r, 'c', F.int(2, 3), f ? { near: [f[0], f[1], 2.5] } : { wall: true });
      F.place(r, 'Ǝ', F.int(0, 2), { wall: true, spread: 2 });
    } },
    belltower: { mix: 'ƜKS', min: 9, fits: r => r.box.w <= 7 && r.box.h <= 7, fill(r, F) { // klocktorn: en klocka i mitten (högst två per bana), ben i hörnen
      if (!F.place(r, 'Ɛ', 1, { center: true, jit: 1 }).length) F.place(r, 'u', 1, { center: true });
      F.place(r, 'j', F.int(1, 2), { corner: true });
      F.place(r, 'c', F.int(0, 1), { wall: true });
    } },
    // --- version 15: bikupan (larvsäckar Ɨ; honungskakor Ɣ, honung Ɩ och fler larvsäckar sätts av content15) ---
    hexcell: { mix: 'ƚKS', min: 9, fill(r, F) { // vaxcell: larvsäckar längs väggarna och ben (honungspölar i content15)
      F.place(r, 'Ɨ', F.int(0, 2), { wall: true, spread: 3 });
      F.place(r, 'j', F.int(1, 2), {});
    } },
    nursery: { mix: 'ƚƚK', min: 12, fill(r, F) { // larvkammare: rader av larvsäckar
      if (F.grid(r, 'Ɨ', F.int(3, 5)).length < 2) F.place(r, 'Ɨ', F.int(2, 3), { wall: true, spread: 2 });
      F.place(r, 'j', 1, { corner: true });
    } },
    honeyhall: { mix: 'ƚKL', min: 16, fill(r, F) { // honungssal: krukor med honung och lådor (honungspölarna läggs av content15, flest här)
      F.place(r, 'o', F.int(1, 2), { wall: true, spread: 2 });
      F.place(r, 'T', F.int(1, 2), { corner: true, spread: 2 });
    } },
    // --- version 16: den döda trädgården (häckar Ɵ, trädgårdsmur Ơ, fontäner Ƨ, stenstatyer ƨ; taggrankor ƥ sätts av content16) ---
    walledgarden: { mix: 'ƭKS', min: 16, fill(r, F) { // murad trädgård: trädgårdsmur Ơ runt rummet, träd, en stenstaty och ett ljus
      F.rewall(r, 'Ơ');
      F.place(r, 't', F.int(1, 3), { spread: 2 });
      F.place(r, 'ƨ', 1, { wall: true });
      F.place(r, 'c', F.int(0, 1), { wall: true });
    } },
    hedgewalk: { mix: 'ƭXK', min: 20, fits: r => r.box.w >= 5 && r.box.h >= 5, fill(r, F) { // häckgångar: rader av häckar med luckor
      F.stacks(r, 'Ɵ', 0.85);
      F.place(r, 'ƨ', F.int(0, 1), { wall: true });
    } },
    statuewalk: { mix: 'ƭKS', min: 16, fill(r, F) { // statygång: stenstatyer i två rader längs långsidan
      if (F.pillars(r, 'ƨ').length < 2) F.place(r, 'ƨ', F.int(2, 3), { wall: true, spread: 2 });
      F.place(r, 'j', F.int(0, 1), {});
    } },
    fountaincourt: { mix: 'ƭKX', min: 20, fill(r, F) { // fontängård: en fontän (högst två per bana) i mitten med statyer och ljus runt om, träd
      const f = F.putAt(r.cx, r.cy, 'Ƨ') ? [r.cx, r.cy] : F.place(r, 'Ƨ', 1, { open: true, center: true, jit: 1.5 })[0];
      if (f) for (const [dx, dy] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) F.putAt(f[0] + dx, f[1] + dy, F.chance(0.5) ? 'ƨ' : 'c');
      else F.place(r, 'ƨ', 1, { center: true });
      F.place(r, 't', F.int(0, 2), { wall: true, spread: 3 });
    } },
    // --- version 16: drömriket (glidande väggar ƣ, falska dörrar Ʃ, drömlyktor ƪ; sömnens dimma Ʀ sätts av content16) ---
    chessboard: { mix: 'ƮKS', min: 16, fill(r, F) { // schackbrädesal: rutigt golv (drömruta/marmor), statyer som pjäser i ett rutnät, drömlyktor
      F.checker(r, 'floor_marble');
      F.grid(r, 'u', F.int(2, 4));
      F.place(r, 'ƪ', F.int(1, 2), { wall: true, spread: 3 });
    } },
    shifthall: { mix: 'ƮSK', min: 16, fits: r => r.box.w >= 5 && r.box.h >= 5, fill(r, F) { // de glidande väggarnas sal: rader av glidande väggar ƣ
      F.shifts(r, 0.9);
      F.place(r, 'ƪ', 1, { wall: true });
    } },
    falsedoors: { mix: 'ƮKV', min: 12, fill(r, F) { // de falska dörrarnas rum: 1-2 falska dörrar mot väggarna, en lykta, ibland en kista
      F.place(r, 'Ʃ', F.int(1, 2), { wall: true, spread: 3, pred: F.front });
      F.place(r, 'ƪ', 1, { wall: true });
      F.chest(r, 0.3);
    } },
    // --- specialrum (inga fiender) ---
    alchemy: { floor: 'floor_wood_planks', fill(r, F) { // alkemistens rum: alkemisten, bokhyllor, bord med drycker
      const a = F.npc(r, '£');
      F.shelves(r, 'q', 2 + Math.min(3, Math.floor(r.cells.length / 16)));
      const t = F.place(r, 'J', F.int(1, 2), a ? { near: [a[0], a[1], 3.5], spread: 2 } : { open: true, center: true });
      const tt = t[0] || F.place(r, 'J', 1, {})[0];
      F.place(r, '¥', F.int(1, 2), tt ? { near: [tt[0], tt[1], 2.5] } : {});
      F.place(r, 'c', 1, { wall: true });
    } },
    chapel2: { floor: 'floor_tiles_blue', fill(r, F) { // kapell med präst: prästen vid väggen, ljus runt om, bänkrader
      const p = F.npc(r, '€');
      F.place(r, 'c', F.int(2, 3), p ? { near: [p[0], p[1], 2.5], spread: 1 } : { wall: true, spread: 3 });
      if (!F.row(r, 'J', F.int(2, 4), true).length) F.place(r, 'J', F.int(1, 2), { spread: 2 });
      F.place(r, 'u', F.int(0, 1), { wall: true, avoid: ['€', 2] });
    } },
    smithy: { floor: 'floor_stone', fill(r, F) { // smedja: städ, essja och lådor
      if (!F.place(r, '(', 1, { open: true, center: true, jit: 2 }).length && !F.place(r, '(', 1, { center: true }).length) F.place(r, '(', 1, {});
      F.place(r, 'f', 1, { wall: true });
      F.place(r, 'T', F.int(2, 3), { corner: true, spread: 2 });
      F.place(r, 'H', F.int(0, 1), { wall: true });
    } },
    fortune: { floor: 'floor_tiles_blue', fill(r, F) { // spåaltare
      const p = F.place(r, ')', 1, { wall: true, center: true, jit: 2 })[0] || F.place(r, ')', 1, { center: true })[0] || F.place(r, ')', 1, {})[0];
      F.place(r, 'c', F.int(2, 3), p ? { near: [p[0], p[1], 2.5] } : { spread: 2 });
      F.place(r, 'u', F.int(0, 1), { wall: true });
    } },
    challenge: { floor: 'floor_stone_pattern', fill(r, F) { // utmaningsaltare mitt i en öppen sal, facklor runt om (spelet skickar vågor)
      if (!F.place(r, '?', 1, { open: true, center: true, jit: 0.5 }).length && !F.place(r, '?', 1, { center: true }).length) F.place(r, '?', 1, {});
      F.place(r, 'f', F.int(2, 4), { wall: true, spread: 4 });
      F.place(r, 'c', F.int(0, 1), { wall: true });
    } },
    offering: { fill(r, F) { // offerskål bland levande ljus
      const p = F.place(r, ';', 1, { center: true, jit: 1.5 })[0] || F.place(r, ';', 1, {})[0];
      F.place(r, 'c', F.int(3, 4), p ? { near: [p[0], p[1], 2.5], spread: 1 } : { wall: true, spread: 2 });
      F.place(r, 'j', F.int(0, 2), {});
    } },
    levervault: { fill(r, F) { F.vault(r); } }, // spakvalv: bara järngrindar (|) in, spaken (/) i ett annat rum
    lockedvault: { fill(r, F) { F.vault(r); } }, // låst valv: bara en låst dörr (]) in, nyckeln (}) någon annanstans
    shop: { fill(r, F) {
      F.place(r, 'c', F.int(1, 2), { wall: true, spread: 3 });
      if (F.shopAt) F.place(r, 'J', 1, { near: [F.shopAt[0], F.shopAt[1], 2.5] });
    } },
    shrine: { floor: 'floor_tiles_blue', fill(r, F) { // helgedom med helande brunn (brunnen sätts när rollen väljs)
      const w = F.wellAt || [r.cx, r.cy];
      F.place(r, 'c', F.int(2, 4), { near: [w[0], w[1], 2.5] });
      F.place(r, 'u', F.int(0, 1), { wall: true });
    } },
    vault: { fill(r, F) { // skattkammare
      F.place(r, 'c', F.int(1, 2), { wall: true, spread: 3 });
      if (r.tag === 'crypt') F.place(r, 'k', 1, { wall: true });
      else if (r.tag === 'hut') F.place(r, 'J', 1, { open: true });
      else if (r.indoor) { F.place(r, 'T', F.int(1, 2), { corner: true }); F.place(r, 'H', F.int(0, 1), { wall: true }); }
      else F.place(r, 'j', F.int(1, 2), {});
    } },
    secret: { fill() {} },
    start: { fill() {} },
    guardian: { fill() {} },
  };
  // rumstyper per biom och områdestagg [id, vikt]
  const ARCH_BY = {
    dungeon: { room: [['library', 3], ['storeroom', 3], ['ossuary', 3], ['prison', 2], ['chapel', 2.5], ['dining', 2.5], ['armory', 2.5], ['torture', 2], ['crypt', 3],
      ['frozen', 1.4], ['flooded', 1.4], ['trap', 1.6], ['gas', 1.2]] },
    caves: { open: [['grotto', 3], ['mushroom', 3], ['boneden', 2], ['mudflat', 2], ['camp', 1.5], ['lava', 2.2], ['nest', 1.6]] },
    graveyard: { open: [['graves', 3], ['statues', 2], ['candles', 3], ['bonefield', 2]], chapel: [['chapel', 1]], crypt: [['crypt', 1], ['frozen', 0.8]], tomb: [['crypt', 1], ['frozen', 1]] },
    forest: { open: [['thicket', 3], ['boneclear', 1], ['mushring', 1], ['nest', 0.6]], clearing: [['mushring', 3], ['boneclear', 2], ['camp', 3], ['cages', 2], ['nest', 1.2]], hut: [['hut', 1]] },
    courtyard: { room: [['library', 2], ['storeroom', 3], ['dining', 3], ['armory', 3], ['chapel', 1.5], ['prison', 1.5], ['crypt', 1]],
      fountain: [['fountain', 1]], open: [['market', 3], ['drill', 2]] },
    swamp: { open: [['bog', 3], ['nest', 2], ['sunkenshrine', 1.6], ['mushroom', 1.4], ['boneclear', 1], ['thicket', 1]], hut: [['hut', 1]] },
    frost: { room: [['barracks', 3], ['throne', 2], ['crystalhall', 2.5], ['frozen', 1.2], ['storeroom', 2], ['armory', 1.5], ['library', 1], ['crypt', 1], ['prison', 1]],
      yard: [['frozenlake', 3], ['statues', 1.2], ['drill', 1.2]] },
    volcano: { room: [['forge', 3], ['magmachamber', 2.5], ['lavalake', 2], ['armory', 1.5], ['storeroom', 1.5], ['crypt', 1], ['prison', 1], ['torture', 1]],
      yard: [['ashfield', 3], ['lavalake', 1.5], ['statues', 0.6]] },
    tomb: { room: [['burialchamber', 3], ['pillarhall', 3], ['treasury', 1.6], ['sandtunnel', 2], ['trap', 1.2], ['crypt', 0.8], ['storeroom', 0.8], ['gas', 0.5]],
      yard: [['sandcourt', 3], ['statues', 1]] },
    crystal: { open: [['geode', 3], ['prismhall', 2.5], ['shardfield', 2.5], ['grotto', 1.5], ['mushroom', 1], ['boneden', 1], ['camp', 1.2]] },
    sunken: { room: [['cistern', 3], ['drownedhall', 2.5], ['wreckhall', 2.5], ['coralgrotto', 2], ['storeroom', 1], ['library', 0.6], ['crypt', 0.8], ['prison', 0.6]],
      yard: [['plaza', 3], ['statues', 0.8]] },
    clock: { room: [['gearworks', 3], ['pendulumhall', 2.5], ['workshop', 2.5], ['storeroom', 1.5], ['armory', 1.5], ['library', 1], ['prison', 0.8], ['crypt', 0.6]] },
    sky: { room: [['cloudisle', 3], ['harpynest', 2], ['stormspire', 2], ['storeroom', 0.6], ['statues', 0.8]], yard: [['cloudcourt', 3], ['statues', 1]] },
    fungus: { open: [['sporegrotto', 3], ['giantcaps', 2.5], ['myceliumden', 2], ['mushroom', 2], ['boneden', 1], ['camp', 1.2], ['nest', 0.8]] }, // version 11
    mirror: { room: [['mirrorhall', 3], ['ballroom', 2.5], ['gallery', 2.5], ['library', 1.2], ['dining', 1], ['chapel', 1], ['storeroom', 0.8], ['armory', 0.8]] },
    library: { room: [['readingroom', 3], ['stacks', 3], ['scriptorium', 2], ['archive', 2], ['library', 1], ['storeroom', 0.6], ['chapel', 0.6], ['crypt', 0.6]] }, // version 13
    foundry: { room: [['smeltery', 3], ['beltworks', 2.5], ['casting', 2.5], ['pressroom', 2], ['storeroom', 1], ['armory', 1.2], ['prison', 0.6]] },
    cathedral: { room: [['nave', 4], ['baptistery', 2.5], ['chapel', 2], ['belltower', 1.2], ['crypt', 1.2], ['ossuary', 1], ['library', 0.5], ['storeroom', 0.5]] }, // version 15
    hive: { room: [['hexcell', 3], ['nursery', 2.5], ['honeyhall', 2.5], ['storeroom', 0.4]] },
    garden: { room: [['walledgarden', 3], ['hedgewalk', 2.5], ['statuewalk', 2], ['fountaincourt', 1], ['statues', 0.8]], // version 16
      yard: [['fountaincourt', 3], ['hedgewalk', 2], ['statuewalk', 1.5], ['walledgarden', 1]] },
    dream: { room: [['chessboard', 3], ['shifthall', 3], ['falsedoors', 2.5], ['statues', 0.8], ['library', 0.6], ['chapel', 0.5]] },
  };

  // ---------- Bana ----------
  function pickBiome(rng, depth, opts) {
    if (opts.biome) { const b = BIOMES.find(b => b.id === opts.biome); if (b) return b; }
    if (opts.theme !== undefined && opts.theme !== null) return BIOMES[0]; // teman finns bara i fängelsehålan
    // de gamla biomerna dras som förut (samma seed ger samma biom); frostfästet och vulkanen tar sina andelar i egna slag
    const ok = b => depth >= b.depth[0] && depth <= b.depth[1], frost = BIOMES.find(b => b.id === 'frost'), volc = BIOMES.find(b => b.id === 'volcano');
    const tomb = BIOMES.find(b => b.id === 'tomb'), late = b => b === volc || b === tomb || ['crystal', 'sunken', 'clock', 'sky', 'fungus', 'mirror', 'library', 'foundry',
      'cathedral', 'hive', 'garden', 'dream'].includes(b.id); // egna slag
    const base = rng.weighted(BIOMES, b => (b !== frost && !late(b) && ok(b) ? b.weight : 0));
    const tot = BIOMES.reduce((n, b) => n + (ok(b) && !late(b) ? b.weight : 0), 0);
    const v5 = ok(frost) && rng.fork('frost').chance(frost.weight / tot) ? frost : base;
    const v6 = ok(volc) && rng.fork('volcano').chance(volc.weight / (tot + volc.weight)) ? volc : v5;
    // version 7: gravkammaren tar sin andel i ett eget slag (övriga seeds behåller sin biom från version 6)
    const v7 = ok(tomb) && rng.fork('tomb').chance(tomb.weight / (tot + volc.weight + tomb.weight)) ? tomb : v6;
    // version 8: kristallgrottorna och den sjunkna staden tar sina andelar i egna slag ur gaffeln 'v8' (övriga seeds behåller sin biom)
    const cry = BIOMES.find(b => b.id === 'crystal'), sun = BIOMES.find(b => b.id === 'sunken'), f8 = rng.fork('v8'), t8 = tot + volc.weight + tomb.weight;
    const v8 = ok(cry) && f8.fork('crystal').chance(cry.weight / (t8 + cry.weight)) ? cry : v7;
    const v8b = ok(sun) && f8.fork('sunken').chance(sun.weight / (t8 + cry.weight + sun.weight)) ? sun : v8;
    // version 9: klocktornet och molnborgen tar sina andelar i egna slag ur gaffeln 'v9' (övriga seeds behåller sin biom)
    const clk = BIOMES.find(b => b.id === 'clock'), skb = BIOMES.find(b => b.id === 'sky'), f9 = rng.fork('v9'), t9 = t8 + cry.weight + sun.weight;
    const v9 = ok(clk) && f9.fork('clock').chance(clk.weight / (t9 + clk.weight)) ? clk : v8b;
    const v9b = ok(skb) && f9.fork('sky').chance(skb.weight / (t9 + clk.weight + skb.weight)) ? skb : v9;
    // version 11: svampriket och spegelpalatset tar sina andelar i egna slag ur gaffeln 'v11' (övriga seeds behåller sin biom)
    const fun = BIOMES.find(b => b.id === 'fungus'), mir = BIOMES.find(b => b.id === 'mirror'), f11 = rng.fork('v11'), t11 = t9 + clk.weight + skb.weight;
    const v11 = ok(fun) && f11.fork('fungus').chance(fun.weight / (t11 + fun.weight)) ? fun : v9b;
    const v11b = ok(mir) && f11.fork('mirror').chance(mir.weight / (t11 + fun.weight + mir.weight)) ? mir : v11;
    // version 13: biblioteket och gjuteriet tar sina andelar i egna slag ur gaffeln 'v13' (övriga seeds behåller sin biom)
    const lib = BIOMES.find(b => b.id === 'library'), fou = BIOMES.find(b => b.id === 'foundry'), f13 = rng.fork('v13'), t13 = t11 + fun.weight + mir.weight;
    const v13 = ok(lib) && f13.fork('library').chance(lib.weight / (t13 + lib.weight)) ? lib : v11b;
    const v13b = ok(fou) && f13.fork('foundry').chance(fou.weight / (t13 + lib.weight + fou.weight)) ? fou : v13;
    // version 15: blodkatedralen och bikupan tar sina andelar i egna slag ur gaffeln 'v15', version 16: trädgården och drömriket ur 'v16' (övriga seeds
    // behåller sin biom; opts.v15off/opts.v16off stänger av slagen: exakt version 14 resp. 15)
    if (opts.v15off) return v13b;
    const cat = BIOMES.find(b => b.id === 'cathedral'), hiv = BIOMES.find(b => b.id === 'hive'), f15 = rng.fork('v15'), t15 = t13 + lib.weight + fou.weight;
    const v15 = ok(cat) && f15.fork('cathedral').chance(cat.weight / (t15 + cat.weight)) ? cat : v13b;
    const v15b = ok(hiv) && f15.fork('hive').chance(hiv.weight / (t15 + cat.weight + hiv.weight)) ? hiv : v15;
    if (opts.v16off) return v15b;
    const gar = BIOMES.find(b => b.id === 'garden'), drm = BIOMES.find(b => b.id === 'dream'), f16 = rng.fork('v16'), t16 = t15 + cat.weight + hiv.weight;
    const v16 = ok(gar) && f16.fork('garden').chance(gar.weight / (t16 + gar.weight)) ? gar : v15b;
    return ok(drm) && f16.fork('dream').chance(drm.weight / (t16 + gar.weight + drm.weight)) ? drm : v16;
  }
  // vaktaren: opts.guardian, annars deterministiskt ur seeden (frostfästet: frostväktaren varannan gång, vulkanen: flamväktaren,
  // gravkammaren: faraonen)
  const pickGuardian = (root, opts, biome) => (GUARDIANS[opts.guardian] ? opts.guardian
    : biome === 'frost' && root.fork('guardian-frost').chance(0.5) ? 'frost'
      : biome === 'volcano' && root.fork('guardian-flame').chance(0.5) ? 'flame'
        : biome === 'tomb' && root.fork('guardian-pharaoh').chance(0.5) ? 'pharaoh'
          : biome === 'crystal' && root.fork('guardian-crystal').chance(0.5) ? 'crystalqueen' // version 8
            : biome === 'sunken' && root.fork('guardian-sunken').chance(0.5) ? 'leviathan'
              : biome === 'clock' && root.fork('guardian-clock').chance(0.5) ? 'clockmaker' // version 9
                : biome === 'sky' && root.fork('guardian-sky').chance(0.5) ? 'thunderbird'
                  : biome === 'fungus' && root.fork('guardian-fungus').chance(0.5) ? 'mycelmother' // version 11
                    : biome === 'mirror' && root.fork('guardian-mirror').chance(0.5) ? 'mirrorking'
                      : biome === 'library' && root.fork('guardian-library').chance(0.5) ? 'librarian' // version 13
                        : biome === 'foundry' && root.fork('guardian-foundry').chance(0.5) ? 'colossus'
                          : biome === 'cathedral' && root.fork('guardian-cathedral').chance(0.5) ? 'cardinal' // version 15
                            : biome === 'hive' && root.fork('guardian-hive').chance(0.5) ? 'queenbee'
                              : biome === 'garden' && root.fork('guardian-garden').chance(0.5) ? 'gardener' // version 16
                                : biome === 'dream' && root.fork('guardian-dream').chance(0.5) ? 'sandman' : root.fork('guardian').pick(GUARD_IDS));

  function floor(seed, depth, opts) {
    opts = opts || {};
    depth = Math.max(1, Math.min(5, Math.round(depth || 1)));
    if (opts.weapon) opts = Object.assign({}, opts, { weapon: weaponChar(opts.weapon) });
    const root = RNG(seed);
    const biome = pickBiome(root.fork('biome'), depth, opts);
    const gid = pickGuardian(root, opts, biome.id);
    if (biome.id === 'frost') return frostFloor(root, seed, depth, opts, gid, FROST);
    if (biome.id === 'volcano') return frostFloor(root, seed, depth, opts, gid, VOLCANO);
    if (biome.id === 'tomb') return frostFloor(root, seed, depth, opts, gid, TOMB);
    if (biome.id === 'sunken') return frostFloor(root, seed, depth, opts, gid, SUNKEN);
    if (biome.id === 'clock') return frostFloor(root, seed, depth, opts, gid, CLOCK); // version 9
    if (biome.id === 'sky') return frostFloor(root, seed, depth, opts, gid, SKY);
    if (biome.id === 'mirror') return frostFloor(root, seed, depth, opts, gid, MIRROR); // version 11 (svampriket byggs som grottan i biomeFloor)
    if (biome.id === 'library') return frostFloor(root, seed, depth, opts, gid, LIBRARY); // version 13
    if (biome.id === 'foundry') return frostFloor(root, seed, depth, opts, gid, FOUNDRY);
    if (biome.id === 'cathedral') return frostFloor(root, seed, depth, opts, gid, CATHEDRAL); // version 15
    if (biome.id === 'hive') return frostFloor(root, seed, depth, opts, gid, HIVE);
    if (biome.id === 'garden') return frostFloor(root, seed, depth, opts, gid, GARDEN); // version 16
    if (biome.id === 'dream') return frostFloor(root, seed, depth, opts, gid, DREAM);
    if (biome.id !== 'dungeon') return biomeFloor(root, seed, depth, opts, biome, gid);
    const trng = root.fork('theme');
    let theme;
    if (opts.theme !== undefined && opts.theme !== null) {
      theme = typeof opts.theme === 'number' ? THEMES[opts.theme % THEMES.length] : (THEMES.find(t => t.id === opts.theme) || THEMES[0]);
    } else {
      theme = trng.pick(THEMES.filter(t => depth >= t.depth[0] && depth <= t.depth[1]));
    }
    const name = trng.pick(theme.names);
    const ambient = roundAmb(trng, theme.ambient);
    for (let attempt = 0; attempt < 40; attempt++) {
      const K = { id: gid, wall: GUARDIANS[gid].wall, floor: GUARDIANS[gid].floor };
      const level = build7(o => build(root.fork('floor' + attempt), depth, theme, o, K), opts, lv => ({
        name, biome: 'dungeon', floor: lv.floors[0], floors: lv.floors, floorMask: rowsOf(lv.W, lv.H, lv.fm),
        ceil: theme.ceil, sky: null, secretWall: theme.wall, fog: theme.fog.slice(), ambient,
        map: lv.map, depth, seed, rooms: lv.rooms, roomMask: lv.roomMask, theme: theme.id, guardian: gid, boulders: lv.boulders, beams: lv.beams,
        saws: lv.saws, winds: lv.winds, teleports: lv.teleports, belts: lv.belts, arenas: lv.arenas, shifts: lv.shifts,
      }));
      if (!level) { floor.stats.retries++; continue; }
      return level;
    }
    throw new Error('Gen.floor: kunde inte bygga en giltig bana (seed ' + seed + ', djup ' + depth + ')');
  }
  floor.stats = { retries: 0, v7off: 0, v8off: 0, v9off: 0, v10off: 0, v11off: 0, v13off: 0, v14off: 0, v15off: 0, v16off: 0 };

  // version 7: bygger banan (build6), gör banobjektet med mk(lv) och validerar. Underkänns en bana där version 7 lagt ut nya saker
  // byggs samma försök om utan dem (opts.v7off), så att seeds som klarade sig i version 6 aldrig får ett nytt omförsök.
  // version 8: varje bygge görs med version 8 (content8, sist av allt). Underkänns banan och version 8 lade ut nya saker i en gammal biom
  // tas de bort igen (opts.v8.undo: rutorna och deras gamla tecken) och banan valideras om; den är då exakt som i version 7
  // (kristallgrottorna och sjunkna staden byggs alltid med version 8).
  // version 9: likadant med content9 (gaffeln 'v9'): underkänns banan tas version 9-sakerna bort först (opts.v9.undo, utom i klocktornet
  // och molnborgen) och banan valideras om; den är då exakt som i version 8, och först därefter prövas version 8-ångringen.
  // version 10: likadant med content10 (gaffeln 'v10', alla biomer): först tas version 10-sakerna bort (opts.v10.undo) och banan blir exakt
  // som i version 9, sedan prövas version 9- och version 8-ångringen.
  function build7(f, opts, mk) {
    const make = lv => { const level = mk(lv); level.boulders = level.boulders || []; level.beams = level.beams || [];
      if (level.tide === undefined) level.tide = null;
      level.saws = level.saws || []; level.winds = level.winds || []; level.teleports = level.teleports || []; level.belts = level.belts || [];
      level.arenas = level.arenas || []; level.shifts = level.shifts || [];
      level.features = features(level.map, level.beams, level.arenas, level.rooms); return level; };
    const try8 = extra => {
      const o8 = { v8: {}, v9: {}, v10: {}, v11: {}, v13: {}, v14: {}, v15: {}, v16: {} }, lv = build6(f, Object.assign({}, opts, extra, o8));
      if (!lv) return null;
      const level = make(lv);
      if (!validate(level).length) return level;
      const rows = level.map.map(r => r.split(''));
      const redo = () => { level.map = rows.map(r => r.join('')); level.features = features(level.map, level.beams, level.arenas, level.rooms); return !validate(level).length; };
      if (o8.v16.added) { // version 16: drömflaskorna och de inbytta fienderna i andra biomer bort först, banan är då exakt som i version 15
        floor.stats.v16off++;
        for (let k = o8.v16.undo.length - 1; k >= 0; k--) { const [x, y, c] = o8.v16.undo[k]; rows[y][x] = c; }
        if (redo()) return level;
      }
      if (o8.v15.added) { // version 15: bikuporna och de inbytta fienderna i andra biomer bort, banan är då exakt som i version 14
        floor.stats.v15off++;
        for (let k = o8.v15.undo.length - 1; k >= 0; k--) { const [x, y, c] = o8.v15.undo[k]; rows[y][x] = c; }
        if (redo()) return level;
      }
      if (o8.v14.added) { // version 14: rumstyperna, de nya fienderna och arenorna bort först, banan är då exakt som i version 13
        floor.stats.v14off++;
        for (let k = o8.v14.undo.length - 1; k >= 0; k--) { const [x, y, c] = o8.v14.undo[k]; rows[y][x] = c; }
        for (let k = o8.v14.arch.length - 1; k >= 0; k--) { const [i, a] = o8.v14.arch[k]; level.rooms[i].arch = a; }
        level.arenas = [];
        if (redo()) return level;
      }
      if (o8.v13.added) { // version 13: bläckflaskorna (Ƃ) bort först, banan är då exakt som i version 11
        floor.stats.v13off++;
        for (let k = o8.v13.undo.length - 1; k >= 0; k--) { const [x, y, c] = o8.v13.undo[k]; rows[y][x] = c; }
        if (redo()) return level;
      }
      if (o8.v11.added) { // version 11: sporsäckarna (Ũ) bort först, banan är då exakt som i version 10
        floor.stats.v11off++;
        for (let k = o8.v11.undo.length - 1; k >= 0; k--) { const [x, y, c] = o8.v11.undo[k]; rows[y][x] = c; }
        if (redo()) return level;
      }
      if (o8.v10.added) {
        floor.stats.v10off++;
        for (let k = o8.v10.undo.length - 1; k >= 0; k--) { const [x, y, c] = o8.v10.undo[k]; rows[y][x] = c; }
        if (redo()) return level;
      }
      if (o8.v9.added && !o8.v9.keep) {
        floor.stats.v9off++;
        for (const [x, y, c] of o8.v9.undo) rows[y][x] = c;
        if (redo()) return level;
      }
      if (!o8.v8.added || o8.v8.keep) return null;
      floor.stats.v8off++;
      for (const [x, y, c] of o8.v8.undo) rows[y][x] = c;
      return redo() ? level : null;
    };
    const o7 = { v7: {} }, level = try8(o7);
    if (level || !o7.v7.added || opts.biome === 'tomb' || o7.v7.tomb) return level; // gravkammaren byggs alltid med version 7
    floor.stats.v7off++;
    return try8({ v7off: true });
  }

  // version 6: misslyckas ett byggförsök som fick ett lägerrum byggs samma försök om utan lägerrum, så att seeds som annars
  // hade lyckats blir som i version 5 (med de nya sakerna ovanpå)
  function build6(f, opts) {
    const o = Object.assign({}, opts, { v6: {} }), lv = f(o);
    if (lv || !o.v6.camp) return lv;
    o.v6 = { noCamp: true };
    return f(o);
  }

  // level.features: antal av varje ny sak på kartan (tester och spelets HUD)
  const FEATURE_CH = { anvil: '(', fortune: ')', prisoner: '[', challenge: '?', offering: ';', lever: '/', locked: ']', cracked: '{',
    arrows: '<', gas: '>', lava: '_', water: '-', ice: ':', webs: '"', alchemist: '£', priest: '€', petcage: '©', potions: '¥', icicles: 'Ç',
    campfire: '¶', questboard: '®', runes: 'ª', meat: 'ð', firejets: '°', crumble: '¬', pendulums: '±', plates: '¨', secretstairs: '÷',
    poisonbarrels: 'µ', frostbarrels: 'ß',
    sarcophagi: '²', quicksand: '¯', boulders: '¹', bells: '³', gambler: 'ç', banker: 'ÿ', wanderer: 'ý', pages: 'þ', batteries: '¼', stones: '½',
    deepwater: 'Đ', crystalspikes: 'Ē', tide: 'Ĕ', breakcrystals: 'Ė', glowcrystals: 'Ę', wrecks: 'Ě', bubbles: 'Ĝ', cartographer: 'Ğ', talentaltar: 'Ġ',
    books: 'Ģ', stalker: 'Ā', witch: 'Ă', eels: 'Ó',
    saws: 'Ŀ', timebubbles: 'ŀ', void: 'Ń', winds: 'ń', clockworks: 'Ņ', lightningrods: 'ņ', chimes: 'Ň', cloudchests: 'ň', gears: 'Ŋ', feathers: 'ŋ',
    gearspiders: 'Ĵ', cloudgiants: 'ĸ',
    jailers: 'Ō', burrowers: 'ō', gravediggers: 'Ŏ', rootlings: 'ŏ', crossbowmen: 'Ő', toads: 'ő', legendaltar: 'Œ', // version 10
    bouncepads: 'ţ', sporepools: 'Ť', teleporters: 'ť', glowshrooms: 'Ŧ', mirrorstatues: 'ŧ', mirrorwalls: 'š', capwalls: 'Ş', sporesacks: 'Ũ', // version 11
    sporelings: 'ŗ', mycelbrutes: 'Ř', shamans: 'ř', mirrorknights: 'Ś', illusionists: 'ś', shardlings: 'Ŝ',
    bookshelves: 'ũ', lecterns: 'Ű', chandeliers: 'ű', inkpools: 'Ŭ', belts: 'Ÿ', molten: 'Ź', vents: 'ź', presses: 'Ż', molds: 'ż', furnaces: 'Ŷ', // version 13
    inkflasks: 'Ƃ', grimoires: 'Ų', inkslimes: 'ų', archivists: 'Ŵ', moltengolems: 'Ž', steambots: 'ž', sparkdrones: 'ſ',
    snowwraiths: 'Ƅ', lavaworms: 'ƅ', scarabpriests: 'Ɔ', crystalspiders: 'Ƈ', anglerfish: 'ƈ', windspirits: 'Ɖ', // version 14
    stainedglass: 'Ƌ', lightbeams: 'ƍ', pews: 'Ǝ', bloodfonts: 'Ə', churchbells: 'Ɛ', honeycomb: 'Ɣ', honey: 'Ɩ', larvasacs: 'Ɨ', beehives: 'ƞ', // version 15
    choirboys: 'Ƒ', flagellants: 'ƒ', cherubs: 'Ɯ', workerbees: 'Ƙ', stingerknights: 'ƙ', larvae: 'ƚ',
    hedges: 'Ɵ', gardenwalls: 'Ơ', shiftwalls: 'ƣ', thorns: 'ƥ', dreammist: 'Ʀ', fountains: 'Ƨ', statues2: 'ƨ', falsedoors: 'Ʃ', dreamlamps: 'ƪ', // version 16
    dreamflasks: 'Ƴ', weepingangels: 'ƫ', thornvines: 'Ƭ', gardeners: 'ƭ', dreameaters: 'Ʈ', doppelgangers: 'Ư', sleepwalkers: 'ư' };
  function features(map, beams, arenas, rooms) {
    const n = {}; for (const row of map) for (const c of row) n[c] = (n[c] || 0) + 1;
    const out = {}; for (const k in FEATURE_CH) out[k] = n[FEATURE_CH[k]] || 0;
    out.beams = beams ? beams.length : 0;
    out.arenas = arenas ? arenas.length : 0; // version 14: arenarum och de nya rumstyperna (antal rum)
    out.setpieces = rooms ? rooms.filter(r => SET14[r.arch]).length : 0;
    return out;
  }

  function biomeFloor(root, seed, depth, opts, biome, gid) {
    const look = LOOKS[biome.id], lrng = root.fork('look');
    const name = lrng.pick(look.names), fog = look.fog(lrng), ambient = roundAmb(lrng, look.ambient);
    for (let attempt = 0; attempt < 40; attempt++) {
      const K = { id: gid, wall: GUARDIANS[gid].wall, floor: GUARDIANS[gid].floor, floors: look.floors.concat([GUARDIANS[gid].floor]), bossIdx: look.floors.length };
      const level = build7(o => look.build(root.fork(biome.id + attempt), depth, o, look, K), opts, res => {
        const G = res.G;
        return {
          name, biome: biome.id, floor: res.floors[0], floors: res.floors, floorMask: rowsOf(G.W, G.H, G.fm),
          ceil: look.ceil, sky: biome.outdoor ? rowsOf(G.W, G.H, G.sky) : null, secretWall: look.wall, fog, ambient,
          map: G.g.map(r => r.join('')), depth, seed, rooms: res.rooms, roomMask: res.roomMask, theme: biome.id, guardian: gid, boulders: G.boulders, beams: G.beams,
          saws: G.saws, winds: G.winds, teleports: G.teleports, belts: G.belts, arenas: G.arenas, shifts: G.shifts,
        };
      });
      if (!level) { floor.stats.retries++; continue; }
      return level;
    }
    throw new Error('Gen.floor: kunde inte bygga en giltig bana (' + biome.id + ', seed ' + seed + ', djup ' + depth + ')');
  }

  // frostfästet, vulkanen och gravkammaren: fängelsehålans bygge med gårdar under himlen (snögårdar, askfält resp. ökengårdar) bland
  // salarna; T = FROST | VOLCANO | TOMB
  function frostFloor(root, seed, depth, opts, gid, T) {
    const lrng = root.fork('look'), id = T.id;
    const name = lrng.pick(T.names), fog = T.fog(lrng), ambient = roundAmb(lrng, T.ambient);
    const tide = id === 'sunken' ? { period: lrng.int(24, 40) } : null; // version 8: tidvattnets period (sekunder)
    for (let attempt = 0; attempt < 40; attempt++) {
      const K = { id: gid, wall: GUARDIANS[gid].wall, floor: GUARDIANS[gid].floor };
      const level = build7(o => build(root.fork(id + attempt), depth, T, o, K, id === 'frost' ? true : id), opts, lv => ({
        name, biome: id, floor: lv.floors[0], floors: lv.floors, floorMask: rowsOf(lv.W, lv.H, lv.fm),
        ceil: T.ceil, sky: T.indoor ? null : rowsOf(lv.W, lv.H, lv.sky), secretWall: T.wall, fog, ambient,
        map: lv.map, depth, seed, rooms: lv.rooms, roomMask: lv.roomMask, theme: id, guardian: gid, boulders: lv.boulders, beams: lv.beams,
        saws: lv.saws, winds: lv.winds, teleports: lv.teleports, belts: lv.belts, arenas: lv.arenas, shifts: lv.shifts, tide: tide ? { period: tide.period } : null,
      }));
      if (!level) { floor.stats.retries++; continue; }
      return level;
    }
    throw new Error('Gen.floor: kunde inte bygga en giltig bana (' + id + ', seed ' + seed + ', djup ' + depth + ')');
  }

  // ---------- Fängelsehålan: rum i olika former + korridorer ----------
  // frost: frostfästet (1-3 stora gårdar under himlen med snögolv, torn och döda träd; allt annat inomhus);
  // frost = 'volcano': vulkanen (samma gårdar men askfält; lavan i rummen sätts av rumstyperna)
  // frost = 'tomb': gravkammaren (ökengårdar med sandgolv; kvicksand, hieroglyfväggar och ljusschakt sätts av content7)
  // frost = 'sunken': sjunkna staden (översvämmade torg med plattor och brutna statyer; vattnet sätts av rumstyperna och content8)
  // frost = 'clock': klocktornet (version 9; byggs som fängelsehålan, inomhus, utan gårdar)
  // frost = 'sky': molnborgen (version 9; som frostfästet med gårdar = stora öar, allt under himlen; väggarna blir tomrum i content9)
  function build(rng, depth, theme, opts, K, frost) {
    const wc = theme.wall, volc = frost === 'volcano', tomb = frost === 'tomb', sunk = frost === 'sunken', clock = frost === 'clock', skyB = frost === 'sky';
    const mirror = frost === 'mirror'; // version 11: spegelpalatset byggs som klocktornet (inomhus, utan gårdar)
    const lib = frost === 'library', fou = frost === 'foundry'; // version 13: biblioteket och gjuteriet likaså
    // version 15/16: katedralen, bikupan och drömriket likaså (inomhus, utan gårdar); trädgården byggs som molnborgen (allt under himlen, gårdar =
    // stora gräsmattor) men med häckar som väggar
    const cath = frost === 'cathedral', hive = frost === 'hive', gard = frost === 'garden', drm = frost === 'dream';
    if (clock || mirror || lib || fou || cath || hive || drm) frost = false;
    const base = 30 + (depth - 1) * 3;
    const W = Math.min(44, base + rng.int(0, 2)), H = Math.min(44, base + rng.int(0, 2));
    const G = Grid(W, H, wc), g = G.g;
    if (skyB || gard) G.sky.fill(1);
    const inb = (x, y) => x >= 1 && y >= 1 && x <= W - 2 && y <= H - 2;

    // ----- 1. Rum: vaktarens sal först (stor), sedan de vanliga -----
    const lo = Math.min(12, 8 + Math.floor((depth - 1) * 1.25)), hi = Math.min(14, lo + 2);
    const target = rng.int(lo, hi);
    const rooms = [];
    const sizeW = [0, 0, 0, 0, 1, 4, 4, 3, 2, 1]; // vikt för storlek 4..9
    const rollSize = cap => rng.weighted([4, 5, 6, 7, 8, 9].filter(s => s <= cap), s => sizeW[s]);
    const gapOK = (a, b, gap) => a.x + a.w + gap <= b.x || b.x + b.w + gap <= a.x || a.y + a.h + gap <= b.y || b.y + b.h + gap <= a.y;
    const mk = (x, y, w, h, type) => ({ x, y, w, h, type, cx: x + (w >> 1), cy: y + (h >> 1), open: [], deg: 0, id: rooms.length });
    {
      const gs = () => rng.int(9, Math.min(11, 9 + (depth >> 1)));
      const w = gs(), h = gs();
      rooms.push(mk(rng.int(2, W - 2 - w), rng.int(2, H - 2 - h), w, h, 'guardian'));
    }
    if (frost) { // snögårdar: stora öppna rektanglar under himlen
      const nY = depth >= 3 ? rng.int(2, 3) : rng.int(1, 2);
      for (let k = 0; k < nY; k++) for (let t = 0; t < 80; t++) {
        const w = rng.int(9, 12), h = rng.int(9, 12), r = mk(rng.int(2, W - 2 - w), rng.int(2, H - 2 - h), w, h, 'normal');
        if (rooms.every(o => gapOK(o, r, 3))) { r.yard = true; rooms.push(r); break; }
      }
      if (rooms.length < 2) return null;
    } else if (cath) { // version 15: katedralens långhus, en stor avlång sal (10-13 x 7-8, längs eller tvärs; kortare på de första djupen)
      for (let t = 0; t < 80; t++) {
        const L = rng.int(10, depth >= 3 ? 13 : 11), S = rng.int(7, 8), hz = rng.chance(0.5), w = hz ? L : S, h = hz ? S : L, r = mk(rng.int(2, W - 2 - w), rng.int(2, H - 2 - h), w, h, 'normal');
        if (rooms.every(o => gapOK(o, r, 3))) { r.big = true; r.nave = true; rooms.push(r); break; }
      }
    } else if (rng.chance(0.4)) for (let t = 0; t < 60; t++) { // ibland en stor öppen sal (plats för ett utmaningsaltare)
      const w = rng.int(7, 9), h = rng.int(7, 9), r = mk(rng.int(2, W - 2 - w), rng.int(2, H - 2 - h), w, h, 'normal');
      if (rooms.every(o => gapOK(o, r, 3))) { r.big = true; rooms.push(r); break; }
    }
    for (let tries = 0; rooms.length < target && tries < 900; tries++) {
      const cap = tries > 450 ? 5 : tries > 150 ? 7 : 9;
      const w = rollSize(cap), h = rollSize(cap);
      const r = mk(rng.int(2, W - 2 - w), rng.int(2, H - 2 - h), w, h, 'normal');
      if (rooms.every(o => gapOK(o, r, 3))) rooms.push(r);
    }
    if (rooms.length < Math.max(frost ? 6 : 7, lo - (frost ? 3 : 2)) - (cath ? 1 : 0)) return null; // (katedralens långhus räknas som två rum)
    const n = rooms.length;
    const forb = new Uint8Array(W * H); // rum + väggring: hit får inga korridorer
    for (const r of rooms) {
      for (let y = r.y - 1; y <= r.y + r.h; y++) for (let x = r.x - 1; x <= r.x + r.w; x++) forb[y * W + x] = 1;
      for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) g[y][x] = '.';
    }
    // rumsformer: rektangel, kors, L, rund, mittblock, inre ring (pelarrader sätts efter dörrarna)
    const fillW = (x0, y0, w, h) => { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) g[y][x] = wc; };
    for (const r of rooms) {
      const { x, y, w, h } = r;
      if (r.type === 'guardian') { // avfasade hörn
        const k = Math.min(w, h) >= 10 ? 2 : 1;
        for (let dy = 0; dy < k; dy++) for (let dx = 0; dx < k - dy; dx++) {
          g[y + dy][x + dx] = wc; g[y + dy][x + w - 1 - dx] = wc; g[y + h - 1 - dy][x + dx] = wc; g[y + h - 1 - dy][x + w - 1 - dx] = wc;
        }
        r.shape = 'hall';
      } else if (r.yard) {
        r.shape = 'yard'; // rektangel; torn och träd planteras efter dörrarna
      } else {
        const sh = [['rect', 1.5]];
        if (w >= 5 && h >= 5) sh.push(['round', 2], ['block', 1.5]);
        if ((w >= 6 && h >= 5) || (w >= 5 && h >= 6)) sh.push(['L', 2]);
        if (w >= 6 && h >= 6) sh.push(['cross', 2]);
        if ((w >= 7 && h >= 5) || (h >= 7 && w >= 5)) sh.push(['pillars', 2]);
        if (w >= 9 && h >= 9) sh.push(['ring', 3]);
        if ((w >= 8 && h >= 5) || (h >= 8 && w >= 5)) sh.push(['vault', 1.5]); // två rum förbundna av en valvbåge
        if (hive && w >= 5 && h >= 5) sh.push(['hex', 9]); // version 15: bikupans sexkantiga celler
        if (cath && w >= 6 && h >= 6) sh.push(['cross', 2]); // katedralens korskapell
        r.shape = rng.weighted(r.nave ? [['rect', 1]] : r.big ? [['rect', 2], ['round', 1], ['pillars', 1.5]] : sh, s => s[1])[0];
        if (r.shape === 'cross') { const cw = Math.floor(w / 3), ch = Math.floor(h / 3); fillW(x, y, cw, ch); fillW(x + w - cw, y, cw, ch); fillW(x, y + h - ch, cw, ch); fillW(x + w - cw, y + h - ch, cw, ch); }
        else if (r.shape === 'L') { const qw = w >> 1, qh = h >> 1, c = rng.int(0, 3); fillW(c & 1 ? x + w - qw : x, c & 2 ? y + h - qh : y, qw, qh); }
        else if (r.shape === 'round') {
          const mx = x + (w - 1) / 2, my = y + (h - 1) / 2;
          for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) if (((xx - mx) / (w / 2)) ** 2 + ((yy - my) / (h / 2)) ** 2 > 1) g[yy][xx] = wc;
        } else if (r.shape === 'block') { const bw = Math.min(w - 4, rng.int(2, 3)), bh = Math.min(h - 4, rng.int(2, 3)); fillW(x + ((w - bw) >> 1), y + ((h - bh) >> 1), bw, bh); }
        else if (r.shape === 'ring') { // inre ring av vägg med två öppningar mitt emot varandra
          const x0 = x + 2, y0 = y + 2, x1 = x + w - 3, y1 = y + h - 3, hz = rng.chance(0.5);
          for (let yy = y0; yy <= y1; yy++) for (let xx = x0; xx <= x1; xx++) if (xx === x0 || xx === x1 || yy === y0 || yy === y1) g[yy][xx] = wc;
          if (hz) { g[(y0 + y1) >> 1][x0] = '.'; g[(y0 + y1 + 1) >> 1][x1] = '.'; } else { g[y0][(x0 + x1) >> 1] = '.'; g[y1][(x0 + x1 + 1) >> 1] = '.'; }
        } else if (r.shape === 'hex') { // sexkant: spetsiga kortsidor (raderna/kolumnerna kapas mot ändarna)
          const hz = w >= h, S = hz ? h : w, L = hz ? w : h, mid = (S - 1) / 2;
          for (let k = 0; k < S; k++) {
            const m = Math.min(Math.floor((L - 3) / 2), Math.round(Math.abs(k - mid) * 0.75));
            for (let a = 0; a < m; a++) for (const e of [a, L - 1 - a]) { if (hz) g[y + k][x + e] = wc; else g[y + e][x + k] = wc; }
          }
        } else if (r.shape === 'vault') { // tvärvägg mitt i rummet med en valvbåge (1-2 rutor) i mitten
          const hz = w >= 8 && (w >= h || h < 8), L = hz ? h : w, gap = L >= 6 ? 2 : 1, a0 = (L - gap) >> 1;
          for (let k = 0; k < L; k++) if (k < a0 || k >= a0 + gap) { if (hz) g[y + k][x + (w >> 1)] = wc; else g[y + (h >> 1)][x + k] = wc; }
        }
      }
      // representativ golvruta (närmast mitten)
      let best = null, bd = 1e9;
      for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) if (g[yy][xx] === '.') { const d = Math.abs(xx - r.cx) + Math.abs(yy - r.cy); if (d < bd) { bd = d; best = [xx, yy]; } }
      if (!best) return null;
      r.rep = best;
    }

    // ----- 2. Förbindelser: minimalt uppspännande träd + några extra; vaktarens sal får 1-2 ingångar -----
    const corr = new Uint8Array(W * H);
    const noise = new Float32Array(W * H);
    for (let i = 0; i < noise.length; i++) noise[i] = rng.next() * 0.6;
    const openings = []; // {x,y,room,horiz,ch}
    const rd = (a, b) => Math.abs(a.cx - b.cx) + Math.abs(a.cy - b.cy);
    const edges = [], have = new Set();
    const inT = new Array(n).fill(false); inT[1] = true;
    for (let k = 2; k < n; k++) {
      let best = null, bd = 1e9;
      for (let i = 1; i < n; i++) if (inT[i]) for (let j = 1; j < n; j++) if (!inT[j]) {
        const d = rd(rooms[i], rooms[j]) + rng.next() * 4;
        if (d < bd) { bd = d; best = [i, j]; }
      }
      inT[best[1]] = true; edges.push(best); have.add(best[0] * 64 + best[1]); have.add(best[1] * 64 + best[0]);
    }
    const gnear = rooms.slice(1).map(r => [r.id, rd(rooms[0], r) + rng.next() * 4]).sort((a, b) => a[1] - b[1]);
    edges.push([gnear[0][0], 0]);
    const extraCand = [];
    for (let i = 1; i < n; i++) for (let j = i + 1; j < n; j++) if (!have.has(i * 64 + j)) extraCand.push([i, j, rd(rooms[i], rooms[j]) + rng.next() * 3]);
    extraCand.sort((a, b) => a[2] - b[2]);
    const nExtra = Math.min(rng.int(1, 3), extraCand.length);
    const extra = rng.shuffle(extraCand.slice(0, Math.max(nExtra * 2, 4))).slice(0, nExtra);

    function pickOpening(room, side) {
      const horizSide = side === 0 || side === 2;
      const len = horizSide ? room.h : room.w;
      const offs = rng.shuffle(Array.from({ length: len }, (_, i) => i));
      for (const off of offs) {
        let ox, oy;
        if (side === 0) { ox = room.x + room.w; oy = room.y + off; }
        else if (side === 2) { ox = room.x - 1; oy = room.y + off; }
        else if (side === 1) { ox = room.x + off; oy = room.y + room.h; }
        else { ox = room.x + off; oy = room.y - 1; }
        const ax = ox + DX[side], ay = oy + DY[side];
        if (!inb(ox, oy) || !inb(ax, ay) || forb[ay * W + ax]) continue;
        if (g[oy - DY[side]][ox - DX[side]] !== '.') continue; // innanför öppningen måste det vara golv (rumsformen)
        if (room.open.some(o => cheb(o.x, o.y, ox, oy) <= 1)) continue;
        return { ox, oy, ax, ay, side, horiz: horizSide };
      }
      return null;
    }

    function route(sx, sy, sdir, tx, ty) {
      const dist = new Float64Array(W * H * 4).fill(Infinity);
      const prev = new Int32Array(W * H * 4).fill(-1);
      const heap = Heap();
      const s0 = (sy * W + sx) * 4 + sdir;
      dist[s0] = 0; heap.push(0, s0);
      while (heap.size) {
        const cur = heap.pop();
        if (heap.key > dist[cur]) continue;
        const d = cur & 3, cell = cur >> 2, x = cell % W, y = (cell / W) | 0;
        if (x === tx && y === ty) {
          const path = [];
          for (let s = cur; s !== -1; s = prev[s]) path.push([(s >> 2) % W, (((s >> 2) / W) | 0)]);
          return path.reverse();
        }
        for (let nd = 0; nd < 4; nd++) {
          if (nd === ((d + 2) & 3)) continue;
          const nx = x + DX[nd], ny = y + DY[nd];
          if (!inb(nx, ny)) continue;
          const ni = ny * W + nx;
          if (forb[ni]) continue;
          const c = dist[cur] + (corr[ni] ? 0.8 : 1) + noise[ni] + (nd !== d ? 2.5 : 0);
          const st = ni * 4 + nd;
          if (c < dist[st]) { dist[st] = c; prev[st] = cur; heap.push(c, st); }
        }
      }
      return null;
    }

    function widen(path) {
      if (path.length < 9 || !rng.chance(0.3)) return;
      const i0 = rng.int(3, path.length - 6);
      const L = Math.min(rng.int(3, 8), path.length - 3 - i0);
      const run = path.slice(i0, i0 + L);
      const horiz = run.every(p => p[1] === run[0][1]), vert = run.every(p => p[0] === run[0][0]);
      if (!horiz && !vert) return;
      const sgn = rng.chance(0.5) ? 1 : -1;
      for (const [x, y] of run) {
        const wx = horiz ? x : x + sgn, wy = horiz ? y + sgn : y;
        if (inb(wx, wy) && !forb[wy * W + wx] && g[wy][wx] === wc) { g[wy][wx] = '.'; corr[wy * W + wx] = 1; }
      }
    }

    function connect(ia, ib) {
      const a = rooms[ia], b = rooms[ib];
      const dx = b.cx - a.cx, dy = b.cy - a.cy;
      const horiz = Math.abs(dx) + rng.next() * 4 >= Math.abs(dy);
      const sidesFor = hz => hz ? (dx > 0 ? [0, 2] : [2, 0]) : (dy > 0 ? [1, 3] : [3, 1]);
      const attempts = [sidesFor(horiz), sidesFor(horiz), sidesFor(!horiz)];
      for (let i = 0; i < 6; i++) attempts.push([rng.int(0, 3), rng.int(0, 3)]);
      for (const [sa, sb] of attempts) {
        const oa = pickOpening(a, sa), ob = pickOpening(b, sb);
        if (!oa || !ob) continue;
        const path = route(oa.ax, oa.ay, sa, ob.ax, ob.ay);
        if (!path) continue;
        for (const [x, y] of path) { g[y][x] = '.'; corr[y * W + x] = 1; }
        for (const [o, room] of [[oa, a], [ob, b]]) {
          g[o.oy][o.ox] = '.';
          room.open.push({ x: o.ox, y: o.oy });
          openings.push({ x: o.ox, y: o.oy, room: room.id, horiz: o.horiz, ch: '.' });
        }
        widen(path);
        a.deg++; b.deg++;
        return true;
      }
      return false;
    }
    for (const [i, j] of edges) if (!connect(i, j)) return null;
    for (const [i, j] of extra) connect(i, j);
    if (gnear[1] && rng.chance(0.35)) connect(gnear[1][0], 0);

    // ----- 3. Dörrar i en del öppningar (alltid in till vaktaren); vaktarens väggring i bossens väggtecken -----
    const doorChance = 0.35 + rng.next() * 0.2;
    for (const o of openings) if (o.room === 0 || rng.chance(doorChance)) { o.ch = 'D'; g[o.y][o.x] = 'D'; }
    const gr = rooms[0];
    for (let y = gr.y - 1; y <= gr.y + gr.h; y++) for (let x = gr.x - 1; x <= gr.x + gr.w; x++) if (g[y][x] === wc) g[y][x] = K.wall;
    for (let y = gr.y; y < gr.y + gr.h; y++) for (let x = gr.x; x < gr.x + gr.w; x++) if (g[y][x] === '.') G.fm[y * W + x] = 1; // floors[1] = vaktarens golv

    // ----- 4. Hemligt rum (3x3 bakom en hemlig vägg) -----
    const nearOpen = (x, y, r) => openings.some(o => cheb(o.x, o.y, x, y) <= r);
    let secret = null;
    if (rng.chance(0.6)) {
      const cands = [];
      for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
        if (g[y][x] !== '.' || nearOpen(x, y, 1)) continue;
        for (let d = 0; d < 4; d++) {
          const ox = x + DX[d], oy = y + DY[d];
          if (g[oy][ox] !== wc) continue;
          for (let k = 0; k < 3; k++) {
            let ix, iy;
            if (d === 0) { ix = ox + 1; iy = y - k; } else if (d === 2) { ix = ox - 3; iy = y - k; }
            else if (d === 1) { iy = oy + 1; ix = x - k; } else { iy = oy - 3; ix = x - k; }
            if (ix < 1 || iy < 1 || ix + 3 > W - 1 || iy + 3 > H - 1) continue;
            let ok = true;
            for (let yy = iy - 1; ok && yy <= iy + 3; yy++) for (let xx = ix - 1; xx <= ix + 3; xx++) if (g[yy][xx] !== wc || (yy >= iy && xx >= ix && yy < iy + 3 && xx < ix + 3 && forb[yy * W + xx])) { ok = false; break; }
            if (ok) cands.push({ ix, iy, ox, oy, d });
          }
        }
      }
      if (cands.length) {
        const c = rng.pick(cands);
        for (let yy = c.iy; yy < c.iy + 3; yy++) for (let xx = c.ix; xx < c.ix + 3; xx++) g[yy][xx] = '.';
        g[c.oy][c.ox] = '*';
        secret = { x: c.ix, y: c.iy, w: 3, h: 3, door: [c.ox, c.oy] };
        openings.push({ x: c.ox, y: c.oy, room: n, horiz: c.d === 0 || c.d === 2, ch: '*' });
      }
    }

    // ----- 5. Roller: start långt från vaktaren, utgången längst från start -----
    const passable = c => !isBlock(c);
    function bfs(sx, sy) {
      const dist = new Int16Array(W * H).fill(-1);
      const q = new Int32Array(W * H); let qh = 0, qt = 0;
      dist[sy * W + sx] = 0; q[qt++] = sy * W + sx;
      while (qh < qt) {
        const cur = q[qh++], x = cur % W, y = (cur / W) | 0;
        for (let d = 0; d < 4; d++) {
          const nx = x + DX[d], ny = y + DY[d];
          if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
          const ni = ny * W + nx;
          if (dist[ni] >= 0 || !passable(g[ny][nx])) continue;
          dist[ni] = dist[cur] + 1; q[qt++] = ni;
        }
      }
      return dist;
    }
    const at = (d, r) => d[r.rep[1] * W + r.rep[0]];
    const dG = bfs(gr.rep[0], gr.rep[1]);
    if (rooms.some(r => at(dG, r) < 0)) return null;
    let start = null, sv = -1;
    for (const r of rooms) if (r !== gr && !r.nave) { const v = at(dG, r) + rng.next() * 3; if (v > sv) { sv = v; start = r; } } // (version 15: aldrig i långhuset)
    start.type = 'start';
    const dS = bfs(start.rep[0], start.rep[1]);
    for (const r of rooms) r.d = at(dS, r);
    let exitRoom = null, ev = -1;
    for (const r of rooms) if (r !== start && r !== gr) { const v = r.d + rng.next() * 0.5; if (v > ev) { ev = v; exitRoom = r; } }
    exitRoom.type = 'exit';

    // ----- 6. Lås kring öppningar, P och x, pelarrader -----
    for (const o of openings) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) G.lockMin(o.x + dx, o.y + dy, 2);
    const spot = r => {
      let best = null, bd = 1e9;
      for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) if (g[y][x] === '.' && G.lock[y * W + x] < 2) { const d = cheb(x, y, r.cx, r.cy) + rng.next(); if (d < bd) { bd = d; best = [x, y]; } }
      return best;
    };
    const P = spot(start), X = spot(exitRoom);
    if (!P || !X) return null;
    g[P[1]][P[0]] = 'P'; g[X[1]][X[0]] = 'x';
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { G.lockMin(P[0] + dx, P[1] + dy, 1); G.lockMin(X[0] + dx, X[1] + dy, 1); }
    for (const r of rooms) if (r.shape === 'pillars') {
      const hz = r.w >= r.h, A = hz ? r.w : r.h, B = hz ? r.h : r.w;
      for (const b of [2, B - 3]) for (let a = 2; a <= A - 3; a += 2) plant(G, hz ? r.x + a : r.x + b, hz ? r.y + b : r.y + a, wc);
    }
    if (gr.w >= 11 && gr.h >= 11) for (const sx of [-3, 3]) for (const sy of [-3, 3]) plant(G, gr.cx + sx, gr.cy + sy, K.wall);
    // frostfästet: gårdarna får himmel och snögolv (floors[2]), några torn (1x1 eller 2x2 Ø) med fri ring runt om och döda träd
    if (frost) for (const r of rooms) if (r.yard) {
      for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) { G.sky[y * W + x] = 1; G.fm[y * W + x] = tomb || sunk || skyB ? 0 : 2; } // gravkammarens gårdar: sand (floors[0]), sjunkna stadens torg: plattor, molnborgens öar: moln
      for (let t = 0, k = 0, nT = rng.int(1, 2) + (r.w * r.h >= 110 ? 1 : 0); t < 40 && k < nT; t++) {
        const s = rng.chance(0.5) ? 2 : 1, x = rng.int(r.x + 2, r.x + r.w - 2 - s), y = rng.int(r.y + 2, r.y + r.h - 2 - s);
        let ok = true;
        for (let yy = y - 1; ok && yy <= y + s; yy++) for (let xx = x - 1; xx <= x + s; xx++) if (g[yy][xx] !== '.' || G.lock[yy * W + xx]) { ok = false; break; }
        if (!ok) continue;
        let n = 0;
        for (let yy = y; yy < y + s; yy++) for (let xx = x; xx < x + s; xx++) if (plant(G, xx, yy, wc)) n++;
        if (n) k++;
      }
      for (let k = rng.int(0, 2); k > 0; k--) plant(G, rng.int(r.x + 1, r.x + r.w - 2), rng.int(r.y + 1, r.y + r.h - 2), sunk || skyB ? 'u' : 't'); // sjunkna staden: brutna statyer, molnborgen: statyer
    }

    // ----- 7. Rumsposter och innehåll -----
    const rid = new Int16Array(W * H).fill(-1);
    const recs = rooms.map(r => {
      const cells = [];
      for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) if (!isWall(g[y][x])) { rid[y * W + x] = r.id; cells.push([x, y]); }
      return { id: r.id, type: r.type, tag: r.yard ? 'yard' : 'room', shape: r.shape, cells, cx: r.cx, cy: r.cy, box: { x: r.x, y: r.y, w: r.w, h: r.h }, d: r.d, deg: r.deg, indoor: !r.yard && !skyB && !gard,
        nave: r.nave };
    });
    let srec = null;
    if (secret) {
      const cells = [];
      for (let y = secret.y; y < secret.y + 3; y++) for (let x = secret.x; x < secret.x + 3; x++) { rid[y * W + x] = n; cells.push([x, y]); }
      srec = { id: n, type: 'secret', tag: 'secret', cells, cx: secret.x + 1, cy: secret.y + 1, box: { x: secret.x, y: secret.y, w: 3, h: 3 }, d: 0, indoor: !skyB && !gard, door: secret.door };
      recs.push(srec);
    }
    const corridors = [];
    for (let i = 0; i < W * H; i++) if (corr[i] && rid[i] < 0 && g[(i / W) | 0][i % W] === '.') corridors.push([i % W, (i / W) | 0]);
    const res = content(G, rng, depth, opts, {
      biome: cath ? 'cathedral' : hive ? 'hive' : gard ? 'garden' : drm ? 'dream' : lib ? 'library' : fou ? 'foundry' : mirror ? 'mirror' : clock ? 'clock' : skyB ? 'sky' : tomb ? 'tomb' : sunk ? 'sunken' : volc ? 'volcano' : frost ? 'frost' : 'dungeon', P, X, rooms: recs, rid, corridors,
      floors: frost && !tomb && !sunk && !skyB ? [theme.floor, K.floor, theme.snow] : [theme.floor, K.floor], gid: K.id,
      guardian: { center: [gr.cx, gr.cy] }, secret: srec, spikes: frost ? rng.int(1, 3) : rng.int(2, 4), vaultWall: wc,
      cfg: frost ? { barrels: { p: 0.5, min: 2 }, deadEnd: true, eliteTags: ['yard'] } : { barrels: { p: 0.55, min: 2 }, deadEnd: true },
    });
    if (!res) return null;
    if (frost) { // gården ska synas: tillräckligt med himmel bland de gångbara rutorna
      let walk = 0, sky = 0;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (!isWall(g[y][x])) { walk++; if (G.sky[y * W + x]) sky++; }
      if (sky < walk * 0.22) return null;
    }
    return { map: g.map(row => row.join('')), rooms: res.rooms, roomMask: res.roomMask, floors: res.floors, fm: G.fm, sky: G.sky, W, H, boulders: G.boulders, beams: G.beams,
      saws: G.saws, winds: G.winds, teleports: G.teleports, belts: G.belts, arenas: G.arenas, shifts: G.shifts };
  }

  // hemligt rum: kortkista eller rustning i mitten, resten slumpat
  function fillSecret(rng, g, secret, cells, secretGold) {
    const cs = rng.shuffle(cells);
    const items = [rng.chance(0.55) ? 'A' : 'C'];
    for (let i = 0; i < secretGold; i++) items.push('$');
    if (rng.chance(0.7)) items.push('h');
    if (rng.chance(0.4)) items.push('a');
    g[secret.cy][secret.cx] = items[0];
    let ci = 0;
    for (let i = 1; i < items.length; i++) {
      while (ci < cs.length && (g[cs[ci][1]][cs[ci][0]] !== '.' || (cs[ci][0] === secret.cx && cs[ci][1] === secret.cy))) ci++;
      if (ci < cs.length) { g[cs[ci][1]][cs[ci][0]] = items[i]; ci++; }
    }
  }

  // ---------- Rutnät: gemensamt API för biomerna ----------
  // g: tecken, fm: golvindex, sky: 1 = öppen himmel, lock: 1 = inga hinder, 2 = inget alls (dörrframsidor o.d.),
  // solid: får aldrig grävas igenom (kant, byggnadsväggar, dörrar), res: reserverat (vaktarens sal: bygget planterar inget där)
  function Grid(W, H, fill, border) {
    const G = { W, H, g: [], fm: new Uint8Array(W * H), sky: new Uint8Array(W * H), lock: new Uint8Array(W * H), solid: new Uint8Array(W * H), res: new Uint8Array(W * H) };
    for (let y = 0; y < H; y++) G.g.push(new Array(W).fill(fill));
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (x === 0 || y === 0 || x === W - 1 || y === H - 1) { G.g[y][x] = border || fill; G.solid[y * W + x] = 1; }
    G.inb = (x, y) => x >= 1 && y >= 1 && x <= W - 2 && y <= H - 2;
    G.at = (x, y) => (x < 0 || y < 0 || x >= W || y >= H) ? '1' : G.g[y][x];
    G.lockMin = (x, y, v) => { if (x >= 0 && y >= 0 && x < W && y < H && G.lock[y * W + x] < v) G.lock[y * W + x] = v; };
    return G;
  }

  // kan (x,y) blockeras utan att något golv tappar kontakten? Lokal koll: alla fria 4-grannar måste hänga ihop
  // via ringen av 8 grannar (räcker för att hela kartan förblir sammanhängande)
  function localOK(G, x, y) {
    const f = [];
    for (let k = 0; k < 8; k++) f.push(!genBlk(G.at(x + RX[k], y + RY[k])));
    let runs = 0;
    for (let k = 0; k < 8; k++) {
      if (!f[k] || f[(k + 7) & 7]) continue; // bara början på en serie fria ringrutor
      let orth = false;
      for (let j = k; j < k + 8 && f[j & 7]; j++) if ((j & 1) === 0) orth = true;
      if (orth) runs++;
    }
    return runs <= 1;
  }
  // sätter ett hinder (träd, gravsten, pelare, ...) om rutan är fri, olåst, inte reserverad och inte stänger av något
  function plant(G, x, y, ch) {
    if (!G.inb(x, y) || G.g[y][x] !== '.' || G.lock[y * G.W + x] || G.res[y * G.W + x] || !localOK(G, x, y)) return false;
    G.g[y][x] = ch; return true;
  }
  function plantNear(G, rng, x, y, ch, r) {
    if (plant(G, x, y, ch)) return [x, y];
    const c = [];
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (dx || dy) c.push([x + dx, y + dy]);
    for (const [xx, yy] of rng.shuffle(c)) if (plant(G, xx, yy, ch)) return [xx, yy];
    return null;
  }

  // BFS-avstånd (4-grannar) från en eller flera startrutor [[x, y], ...]
  function bfsG(G, starts, pass) {
    const { W, H, g } = G; pass = pass || (c => !genBlk(c));
    const dist = new Int16Array(W * H).fill(-1);
    const q = new Int32Array(W * H); let qh = 0, qt = 0;
    for (const [sx, sy] of starts) { const s = sy * W + sx; if (dist[s] < 0) { dist[s] = 0; q[qt++] = s; } }
    while (qh < qt) {
      const cur = q[qh++], x = cur % W, y = (cur / W) | 0;
      for (let d = 0; d < 4; d++) {
        const nx = x + DX[d], ny = y + DY[d];
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const ni = ny * W + nx;
        if (dist[ni] >= 0 || !pass(g[ny][nx])) continue;
        dist[ni] = dist[cur] + 1; q[qt++] = ni;
      }
    }
    return dist;
  }

  // billigaste väg (4-grannar) från någon av starts till en ruta där isGoal(i); cost(i) = Infinity spärrar
  function dijkstra(G, starts, isGoal, cost) {
    const { W } = G, N = W * G.H;
    const dist = new Float64Array(N).fill(Infinity), prev = new Int32Array(N).fill(-1), heap = Heap();
    for (const s of starts) { dist[s] = 0; heap.push(0, s); }
    while (heap.size) {
      const cur = heap.pop();
      if (heap.key > dist[cur]) continue;
      if (isGoal(cur)) { const p = []; for (let s = cur; s !== -1; s = prev[s]) p.push(s); return p.reverse(); }
      const x = cur % W, y = (cur / W) | 0;
      for (let d = 0; d < 4; d++) {
        const nx = x + DX[d], ny = y + DY[d];
        if (!G.inb(nx, ny)) continue;
        const ni = ny * W + nx, c = cost(ni);
        if (!(c < Infinity)) continue;
        const nd = dist[cur] + c;
        if (nd < dist[ni]) { dist[ni] = nd; prev[ni] = cur; heap.push(nd, ni); }
      }
    }
    return null;
  }

  // flood fill: små isolerade fickor fylls med o.fillCh, större kopplas till huvudregionen (största eller den vid o.mainAt)
  // med tunnlar o.width rutor breda. Fickor som innehåller annat än golv (dörrar, föremål) fylls aldrig.
  // Tunnlarna går aldrig genom solida eller reserverade rutor (vaktarens sal).
  function connectRegions(G, rng, o) {
    o = o || {};
    const { W, H, g } = G, N = W * H;
    const pass = o.pass || (c => !genBlk(c));
    const lab = new Int32Array(N).fill(-1), sizes = [], reps = [], pure = [], st = [];
    for (let i = 0; i < N; i++) {
      if (lab[i] >= 0 || !pass(g[(i / W) | 0][i % W])) continue;
      const k = sizes.length; let n = 0, dots = true;
      lab[i] = k; st.push(i);
      while (st.length) {
        const cur = st.pop(), x = cur % W, y = (cur / W) | 0; n++;
        if (g[y][x] !== '.' || G.res[cur]) dots = false;
        for (let d = 0; d < 4; d++) {
          const nx = x + DX[d], ny = y + DY[d];
          if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
          const ni = ny * W + nx;
          if (lab[ni] >= 0 || !pass(g[ny][nx])) continue;
          lab[ni] = k; st.push(ni);
        }
      }
      sizes.push(n); reps.push(i); pure.push(dots);
    }
    if (!sizes.length) return false;
    let main = 0;
    if (o.mainAt) main = lab[o.mainAt[1] * W + o.mainAt[0]]; else for (let k = 1; k < sizes.length; k++) if (sizes[k] > sizes[main]) main = k;
    if (main < 0) return false;
    const tiny = k => k !== main && pure[k] && sizes[k] < (o.minSize || 0);
    for (let i = 0; i < N; i++) if (lab[i] >= 0 && tiny(lab[i])) { g[(i / W) | 0][i % W] = o.fillCh; lab[i] = -1; }
    const order = sizes.map((s, k) => k).filter(k => k !== main && !tiny(k)).sort((a, b) => sizes[b] - sizes[a]);
    if (!order.length) return true;
    const conn = new Uint8Array(N);
    const flood = () => {
      conn.fill(0); conn[reps[main]] = 1; st.push(reps[main]);
      while (st.length) {
        const cur = st.pop(), x = cur % W, y = (cur / W) | 0;
        for (let d = 0; d < 4; d++) {
          const nx = x + DX[d], ny = y + DY[d], ni = ny * W + nx;
          if (nx < 0 || ny < 0 || nx >= W || ny >= H || conn[ni] || !pass(g[ny][nx])) continue;
          conn[ni] = 1; st.push(ni);
        }
      }
    };
    flood();
    const noise = new Float32Array(N); for (let i = 0; i < N; i++) noise[i] = rng.next();
    const w = o.width || 2;
    for (const k of order) {
      if (conn[reps[k]]) continue; // redan ihopkopplad via en tidigare tunnel
      const starts = []; for (let i = 0; i < N; i++) if (lab[i] === k) starts.push(i);
      const path = dijkstra(G, starts, i => conn[i] === 1, i => G.solid[i] || G.res[i] ? Infinity : pass(g[(i / W) | 0][i % W]) ? 0.3 : 1 + noise[i]);
      if (!path) return false;
      for (const i of path) {
        const x = i % W, y = (i / W) | 0;
        for (let dy = 0; dy < w; dy++) for (let dx = 0; dx < w; dx++) {
          const xx = x + dx, yy = y + dy;
          if (!G.inb(xx, yy) || G.solid[yy * W + xx] || G.res[yy * W + xx] || pass(g[yy][xx])) continue;
          g[yy][xx] = '.'; if (o.onCarve) o.onCarve(xx, yy);
        }
      }
      flood();
    }
    return true;
  }

  // avstånd (Chebyshev) till närmaste hinder för varje ruta
  function obstDist(G) {
    const { W, H, g } = G, N = W * H;
    const d = new Int16Array(N).fill(-1), q = new Int32Array(N); let qh = 0, qt = 0;
    for (let i = 0; i < N; i++) if (genBlk(g[(i / W) | 0][i % W])) { d[i] = 0; q[qt++] = i; }
    while (qh < qt) {
      const cur = q[qh++], x = cur % W, y = (cur / W) | 0;
      for (let k = 0; k < 8; k++) {
        const nx = x + RX[k], ny = y + RY[k];
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const ni = ny * W + nx;
        if (d[ni] < 0) { d[ni] = d[cur] + 1; q[qt++] = ni; }
      }
    }
    return d;
  }
  // bryter upp för stora öppna ytor: så länge någon ruta har längre än maxR till närmaste hinder stämplas skydd där
  // (vaktarens reserverade sal hoppas över)
  function breakOpen(G, rng, maxR, stamp) {
    const { W } = G, tried = new Uint8Array(W * G.H);
    for (let i = 0; i < tried.length; i++) if (G.res[i]) tried[i] = 1;
    for (let it = 0; it < 80; it++) {
      const d = obstDist(G);
      let best = 0, list = [];
      for (let i = 0; i < d.length; i++) {
        if (tried[i] || d[i] <= maxR) continue;
        if (d[i] > best) { best = d[i]; list = [i]; } else if (d[i] === best) list.push(i);
      }
      if (!list.length) return;
      const i = rng.pick(list); tried[i] = 1;
      stamp(i % W, (i / W) | 0);
    }
  }

  // värdebrus (bilinjär interpolation av ett slumpgitter) i [0,1], två oktaver, normerat till hela intervallet
  function fbm(rng, W, H, cell) {
    const one = c => {
      const gw = Math.ceil(W / c) + 2, gh = Math.ceil(H / c) + 2, lat = new Float32Array(gw * gh);
      for (let i = 0; i < lat.length; i++) lat[i] = rng.next();
      const ox = rng.next() * c, oy = rng.next() * c, out = new Float32Array(W * H);
      const sm = t => t * t * (3 - 2 * t);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const fx = (x + ox) / c, fy = (y + oy) / c, ix = Math.floor(fx), iy = Math.floor(fy), tx = sm(fx - ix), ty = sm(fy - iy);
        const a = lat[iy * gw + ix], b = lat[iy * gw + ix + 1], cc = lat[(iy + 1) * gw + ix], d = lat[(iy + 1) * gw + ix + 1];
        out[y * W + x] = a + (b - a) * tx + (cc - a) * ty + (a - b - cc + d) * tx * ty;
      }
      return out;
    };
    const A = one(cell), B = one(Math.max(2, cell / 2)), out = new Float32Array(W * H);
    let lo = Infinity, hi = -Infinity;
    for (let i = 0; i < out.length; i++) { out[i] = 0.68 * A[i] + 0.32 * B[i]; lo = Math.min(lo, out[i]); hi = Math.max(hi, out[i]); }
    for (let i = 0; i < out.length; i++) out[i] = (out[i] - lo) / Math.max(1e-6, hi - lo);
    return out;
  }

  // dörr: 3x3 runt den får inga hinder, passagerutorna på båda sidor hålls helt fria
  function markDoor(G, x, y, ox, oy, ix, iy) {
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) G.lockMin(x + dx, y + dy, 1);
    G.lockMin(ox, oy, 2); G.lockMin(ix, iy, 2);
    G.solid[y * G.W + x] = 1;
  }
  // byggnad med yttermått r: väggar wallCh, inre golv floorIdx under tak, nDoors dörrar mitt på olika sidor
  // (sides: sidornas prioritetsordning, annars slumpad)
  function stampBuilding(G, rng, r, wallCh, floorIdx, nDoors, sides) {
    const { W, g } = G;
    for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) {
      const i = y * W + x, edge = x === r.x || y === r.y || x === r.x + r.w - 1 || y === r.y + r.h - 1;
      g[y][x] = edge ? wallCh : '.'; G.solid[i] = edge ? 1 : 0; G.sky[i] = 0;
      if (!edge) G.fm[i] = floorIdx;
    }
    const doors = [];
    for (const side of sides || rng.shuffle([0, 1, 2, 3])) {
      if (doors.length >= nDoors) break;
      const len = side === 0 || side === 2 ? r.h - 2 : r.w - 2, mid = (len - 1) / 2;
      const offs = Array.from({ length: len }, (_, k) => [k, Math.abs(k - mid) + rng.next() * 1.5]).sort((a, b) => a[1] - b[1]);
      for (const [k] of offs) {
        let dx, dy;
        if (side === 0) { dx = r.x + r.w - 1; dy = r.y + 1 + k; } else if (side === 2) { dx = r.x; dy = r.y + 1 + k; }
        else if (side === 1) { dx = r.x + 1 + k; dy = r.y + r.h - 1; } else { dx = r.x + 1 + k; dy = r.y; }
        const ox = dx + DX[side], oy = dy + DY[side];
        if (!G.inb(ox, oy) || g[oy][ox] !== '.' || G.solid[oy * W + ox]) continue;
        g[dy][dx] = 'D'; markDoor(G, dx, dy, ox, oy, dx - DX[side], dy - DY[side]);
        doors.push({ x: dx, y: dy, out: [ox, oy] });
        break;
      }
    }
    if (!doors.length) return null;
    return { x: r.x + 1, y: r.y + 1, w: r.w - 2, h: r.h - 2, cx: r.x + (r.w >> 1), cy: r.y + (r.h >> 1), doors };
  }

  // vaktarens lya i grottan/skogen: rund sal med mitt (cx, cy) och radie rad, ring av väggtecknet wch runt om (solid),
  // golv fIdx, reserverad så att bygget inte planterar något där
  function stampLair(G, rng, cx, cy, rad, wch, fIdx, skyV) {
    const { W, H, g } = G, inside = new Uint8Array(W * H), ring = new Uint8Array(W * H), cells = [];
    for (let y = cy - rad; y <= cy + rad; y++) for (let x = cx - rad; x <= cx + rad; x++) {
      const dd = Math.hypot(x - cx, y - cy) + (rng.next() - 0.5) * 0.25;
      if (G.inb(x, y) && (dd <= rad + 0.2 || cheb(x, y, cx, cy) <= 2)) inside[y * W + x] = 1;
    }
    for (let y = cy - rad; y <= cy + rad; y++) for (let x = cx - rad; x <= cx + rad; x++) {
      const i = y * W + x;
      if (!inside[i]) continue;
      g[y][x] = '.'; G.fm[i] = fIdx; G.sky[i] = skyV; G.res[i] = 1; G.solid[i] = 0; cells.push([x, y]);
      for (let k = 0; k < 8; k++) {
        const nx = x + RX[k], ny = y + RY[k], ni = ny * W + nx;
        if (inside[ni] || ring[ni]) continue;
        ring[ni] = 1; g[ny][nx] = wch; G.solid[ni] = 1; G.sky[ni] = skyV;
      }
    }
    return { cx, cy, rad, inside, ring, cells, fIdx, skyV };
  }
  // n öppningar i lyans ring, så långt isär som möjligt; score(utsida x, y) = lägre är bättre
  function lairGaps(G, rng, lair, n, score) {
    const { W, g } = G, cand = [];
    for (let i = 0; i < lair.ring.length; i++) {
      if (!lair.ring[i]) continue;
      const x = i % W, y = (i / W) | 0;
      for (let d = 0; d < 4; d++) {
        const ix = x - DX[d], iy = y - DY[d], ox = x + DX[d], oy = y + DY[d], oi = oy * W + ox;
        if (!lair.inside[iy * W + ix] || !G.inb(ox, oy) || lair.inside[oi] || lair.ring[oi] || G.solid[oi]) continue;
        if (!isWall(g[y + DX[d]][x + DY[d]]) || !isWall(g[y - DX[d]][x - DY[d]])) continue; // väggar på båda sidor om öppningen
        cand.push({ x, y, in: [ix, iy], out: [ox, oy], ang: Math.atan2(y - lair.cy, x - lair.cx), s: score(ox, oy) + rng.next() * 3 });
      }
    }
    cand.sort((a, b) => a.s - b.s);
    const out = [];
    const angGap = (a, b) => { const d = Math.abs(a - b) % (2 * Math.PI); return Math.min(d, 2 * Math.PI - d); };
    for (const c of cand) { if (out.length >= n) break; if (out.some(o => angGap(o.ang, c.ang) < 1.7)) continue; out.push(c); }
    for (const c of out) {
      const i = c.y * W + c.x;
      g[c.y][c.x] = '.'; G.solid[i] = 0; G.fm[i] = lair.fIdx; G.sky[i] = lair.skyV; G.res[i] = 1;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) G.lockMin(c.x + dx, c.y + dy, 1);
      G.lockMin(c.x, c.y, 2); G.lockMin(c.in[0], c.in[1], 2); G.lockMin(c.out[0], c.out[1], 2);
    }
    return out;
  }

  // hemlig ficka (3x3) bakom en hemlig vägg i massivt berg/skog av tecknet wc
  function addSecretG(G, rng, wc) {
    const { W, H, g } = G, cands = [];
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      if (g[y][x] !== '.' || G.lock[y * W + x] || G.res[y * W + x]) continue;
      for (let d = 0; d < 4; d++) {
        const ox = x + DX[d], oy = y + DY[d];
        if (g[oy][ox] !== wc) continue;
        for (let k = 0; k < 3; k++) {
          let ix, iy;
          if (d === 0) { ix = ox + 1; iy = y - k; } else if (d === 2) { ix = ox - 3; iy = y - k; }
          else if (d === 1) { iy = oy + 1; ix = x - k; } else { iy = oy - 3; ix = x - k; }
          if (ix < 1 || iy < 1 || ix + 3 > W - 1 || iy + 3 > H - 1) continue;
          let ok = true;
          for (let yy = iy - 1; ok && yy <= iy + 3; yy++) for (let xx = ix - 1; xx <= ix + 3; xx++) if (g[yy][xx] !== wc) { ok = false; break; }
          if (ok) cands.push({ ix, iy, ox, oy, x, y });
        }
      }
    }
    if (!cands.length) return null;
    const c = rng.pick(cands), skyV = G.sky[c.y * W + c.x];
    for (let yy = c.iy; yy < c.iy + 3; yy++) for (let xx = c.ix; xx < c.ix + 3; xx++) { g[yy][xx] = '.'; G.fm[yy * W + xx] = 0; G.sky[yy * W + xx] = skyV; G.lockMin(xx, yy, 1); }
    g[c.oy][c.ox] = '*'; G.sky[c.oy * W + c.ox] = skyV;
    markDoor(G, c.ox, c.oy, c.x, c.y, c.x, c.y);
    return { x: c.ix, y: c.iy, w: 3, h: 3, type: 'secret', cx: c.ix + 1, cy: c.iy + 1, door: [c.ox, c.oy] };
  }

  // ---------- Innehåll (alla biomer): roller, rumstyper, rekvisita, föremål, fiendegrupper ----------
  // L: { biome, P, X, rooms: [{ id, type, tag, cells, cx, cy, box, d, deg?, indoor, outBox? }] (id = index),
  //      rid (rum-id per ruta, -1 utanför), corridors? (korridorrutor, fängelsehålan), floors (utökas vid behov),
  //      gid (vaktare), guardian: { center }, secret (rumspost eller null), spikes (önskat antal spikfällor),
  //      cfg: { treasureTags, extraChest, eliteTags, shrineTags, barrels: { p, min, tags }, deadEnd } }
  // Varje rum utom start får rekvisita efter sin rumstyp och antingen en fiendegrupp (2-5, aldrig exakt en) eller,
  // för specialrummen (shop, shrine, treasure, secret, guardian), föremål/interaktiva saker i stället.
  function content(G, rng, depth, opts, L) {
    const rngMain = rng;
    const { W, g, lock, fm } = G, { P, X, rooms, rid } = L, cfg = L.cfg || {};
    G.shifts = []; // version 16: glidande väggar (drömriket) [{ x, y, ph }]
    const cnt = {}, CAP = { o: 8, e: 4, z: 6, w: 1, y: 1, '(': 1, ')': 1, '[': 1, '?': 1, ';': 1, '/': 1, '}': 1, "'": 1, '<': 4, '>': 3, ',': 5,
      '£': 1, '€': 1, '©': 1, '¥': 2, 'Ç': 8, '¶': 1, '®': 1, '÷': 1, 'ª': 1, 'ð': 2, '°': 4, '¬': 8, '±': 3, '¨': 2, 'µ': 3, 'ß': 3,
      '²': 5, '³': 1, 'ç': 1, 'ÿ': 1, 'ý': 1, 'þ': 1, '¼': 2, '½': 2, '¹': 1, '¯': QUICKSAND_CAP, 'Î': 1, 'Ô': 1,
      'Ė': 4, 'Ě': 3, 'Ğ': 1, 'Ġ': 1, 'Ģ': 2, 'Ā': 1, 'Ă': 1, 'Ē': SPIKES8_CAP, 'Ĕ': TIDE_CAP, 'Ĝ': 6, 'Ó': 4,
      'Ŋ': 3, 'ŋ': 1, 'ŀ': 3, 'Ň': 1, 'ň': 3, 'ĸ': 2, 'Œ': 1, 'Ũ': SPORESACK11_CAP, 'Ř': 2, 'ś': 2,
      'Ɛ': BELL15_CAP, 'Ə': FONT15_CAP, 'Ɨ': SAC15_CAP, 'Ƨ': FOUNTAIN16_CAP, 'Ʃ': FALSEDOOR16_CAP }; // version 15/16
    const can = ch => CAP[ch] === undefined || (cnt[ch] || 0) < CAP[ch];
    const set = (x, y, ch) => {
      g[y][x] = ch; cnt[ch] = (cnt[ch] || 0) + 1;
      if (isInter(ch)) for (let d = 0; d < 4; d++) G.lockMin(x + DX[d], y + DY[d], 1); // altare/städ/bur/spak/NPC: fri framsida
    };
    const size = r => r.cells.length;
    const farFromP = (x, y) => (x - P[0]) * (x - P[0]) + (y - P[1]) * (y - P[1]) >= 49;
    const nWall = (x, y) => (isWall(g[y - 1][x]) ? 1 : 0) + (isWall(g[y + 1][x]) ? 1 : 0) + (isWall(g[y][x - 1]) ? 1 : 0) + (isWall(g[y][x + 1]) ? 1 : 0);
    const nearCh = (x, y, ch, d) => { for (let yy = y - d; yy <= y + d; yy++) for (let xx = x - d; xx <= x + d; xx++) if (G.at(xx, yy) === ch) return true; return false; };
    // kandidatrutor i rummet, sorterade (o.near/o.center: närmast först, annars slumpordning)
    // o: block (hinder: kräver olåst ruta), strict (olåst även för icke-hinder), wall, corner, open, far, pred, avoid: [tecken, avstånd], jit,
    //    rng (eget slumpflöde, version 6)
    const resv = new Uint8Array(W * G.H); // fiendernas reserverade rutor (stridsrummen får alltid plats med en grupp)
    function cands(r, o) {
      const out = [], lim = o.block || o.strict ? 0 : 1, rng = o.rng || rngMain;
      for (const p of r.cells) {
        const x = p[0], y = p[1];
        if (g[y][x] !== '.' || lock[y * W + x] > lim || (resv[y * W + x] && !o.enemy)) continue;
        if (o.wall || o.corner || o.open) { const nw = nWall(x, y); if ((o.wall && !nw) || (o.corner && nw < 2) || (o.open && nw)) continue; }
        if (o.far && !farFromP(x, y)) continue;
        if (o.pred && !o.pred(x, y)) continue;
        if (o.avoid && nearCh(x, y, o.avoid[0], o.avoid[1])) continue;
        let k;
        if (o.near) { k = Math.hypot(x - o.near[0], y - o.near[1]); if (o.near[2] !== undefined && k > o.near[2]) continue; k += rng.next() * (o.jit || 0.6); }
        else if (o.center) k = Math.hypot(x - r.cx, y - r.cy) + rng.next() * (o.jit || 0.9);
        else k = rng.next();
        out.push([x, y, k]);
      }
      return out.sort((a, b) => a[2] - b[2]);
    }
    // placerar upp till n st av tecknet ch; hinder går genom localOK så att inget stängs av
    function place(r, ch, n, o) {
      o = o || {};
      const done = [];
      if (n <= 0 || !can(ch)) return done;
      const block = genBlk(ch);
      for (const [x, y] of cands(r, block ? Object.assign({ block: true }, o) : o)) {
        if (done.length >= n || !can(ch)) break;
        if (g[y][x] !== '.') continue;
        if (o.spread && done.some(p => cheb(p[0], p[1], x, y) < o.spread)) continue;
        if (block && !localOK(G, x, y)) continue;
        set(x, y, ch); done.push([x, y]);
      }
      return done;
    }
    function putAt(x, y, ch) {
      if (!G.inb(x, y) || g[y][x] !== '.' || !can(ch)) return false;
      if (genBlk(ch) ? lock[y * W + x] || !localOK(G, x, y) : lock[y * W + x] > 1) return false;
      set(x, y, ch); return true;
    }
    // bokhyllor o.d. i korta rader längs väggarna
    function shelves(r, ch, n) {
      let left = n;
      for (const [x, y] of cands(r, { block: true, wall: true })) {
        if (left <= 0) break;
        if (g[y][x] !== '.' || !localOK(G, x, y)) continue;
        const hz = isWall(g[y - 1][x]) || isWall(g[y + 1][x]);
        for (let k = 0, run = rng.int(2, 4); k < run && left > 0; k++) {
          const xx = x + (hz ? k : 0), yy = y + (hz ? 0 : k), i = yy * W + xx;
          if (rid[i] !== r.id || g[yy][xx] !== '.' || lock[i] || !nWall(xx, yy) || !localOK(G, xx, yy)) break;
          set(xx, yy, ch); left--;
        }
      }
      return n - left;
    }
    // bord i en rad genom rummets mitt längs långsidan (gap: varannan ruta); är mittlinjen upptagen prövas linjerna bredvid,
    // stora rum får två parallella rader
    function row(r, ch, n, gap) {
      const b = r.box, hz = b.w >= b.h, done = [], c0 = hz ? r.cy : r.cx;
      const maxLines = (hz ? b.h : b.w) >= 8 && n >= 4 ? 2 : 1, used = [];
      for (const off of [0, 1, -1, 2, -2, 3, -3]) {
        if (done.length >= n || used.length >= maxLines) break;
        const ln = c0 + off;
        if (used.some(u => Math.abs(u - ln) < 3)) continue;
        const a0 = (hz ? b.x : b.y) + 2, a1 = (hz ? b.x + b.w : b.y + b.h) - 3, before = done.length;
        for (let a = a0; a <= a1 && done.length < n; a += gap ? 2 : 1) {
          const x = hz ? a : ln, y = hz ? ln : a, i = y * W + x;
          if (!G.inb(x, y) || rid[i] !== r.id || g[y][x] !== '.' || lock[i] || !can(ch) || !localOK(G, x, y)) continue;
          set(x, y, ch); done.push([x, y]);
        }
        if (done.length > before) used.push(ln);
      }
      return done;
    }
    // rader av likkistor: var annan ruta på långsidan, var tredje tvärs över
    function grid(r, ch, n) {
      const b = r.box, hz = b.w >= b.h;
      return place(r, ch, n, { open: true, center: true, jit: 3, pred: (x, y) => ((hz ? x - b.x : y - b.y) % 2 === 1) && ((hz ? y - b.y : x - b.x) % 3 === 1) });
    }
    // ring (svampring) med radien rad runt rummets mitt
    function ring(r, ch, rad, n) {
      const c = r.cells.filter(([x, y]) => g[y][x] === '.' && lock[y * W + x] < 2 && Math.abs(Math.hypot(x - r.cx, y - r.cy) - rad) < 0.55)
        .map(([x, y]) => [x, y, Math.atan2(y - r.cy, x - r.cx)]).sort((a, b) => a[2] - b[2]);
      const done = [];
      for (const [x, y] of c) {
        if (done.length >= n || !can(ch)) break;
        if (done.some(p => cheb(p[0], p[1], x, y) < 2)) continue;
        set(x, y, ch); done.push([x, y]);
      }
      return done;
    }
    // marknadsstånd: två bord och en låda i rad
    function stalls(r, n) {
      let k = 0;
      for (const [x, y] of cands(r, { block: true, open: true })) {
        if (k >= n) break;
        if (nearCh(x, y, 'J', 3)) continue;
        const hz = rng.chance(0.5), seq = rng.chance(0.5) ? 'JJT' : 'TJJ';
        let ok = true;
        for (let t = 0; t < 3 && ok; t++) { const xx = hz ? x + t : x, yy = hz ? y : y + t, i = yy * W + xx; ok = G.inb(xx, yy) && rid[i] === r.id && g[yy][xx] === '.' && !lock[i]; }
        if (!ok) continue;
        let m = 0;
        for (let t = 0; t < 3; t++) { const xx = hz ? x + t : x, yy = hz ? y : y + t; if (localOK(G, xx, yy)) { set(xx, yy, seq[t]); m++; } else break; }
        if (m) k++;
      }
      return k;
    }
    // altare (om banan får ett) eller staty vid väggen närmast rummets mitt
    function focal(r) {
      const ch = L.altar && can('y') ? 'y' : 'u';
      return place(r, ch, 1, { wall: true, center: true, jit: 2 })[0] || place(r, ch, 1, { center: true })[0] || null;
    }
    const extraChests = [];
    function chest(r, p) { if (rng.chance(p)) { const c = place(r, 'C', 1, { wall: true, far: true })[0]; if (c) extraChests.push(c); } }
    const floorIdx = name => { let k = L.floors.indexOf(name); if (k < 0 && L.floors.length < 10) { L.floors.push(name); k = L.floors.length - 1; } return k; };
    function paint(r, name) { const k = floorIdx(name); if (k >= 0) for (const [x, y] of r.cells) if (!isWall(g[y][x])) fm[y * W + x] = k; }
    // valvets skatt: kista (oftast) i mitten, en rustning eller hälsa/ammo, ibland granater, ett ljus i ett hörn
    function vault(r) {
      const loot = [rng.chance(r.lock === 'key' ? 0.85 : 0.6) ? 'C' : 'A', rng.pick(['A', 'h', 'a']), rng.chance(0.5) ? ',' : rng.pick(['h', 'a'])];
      if (rng.chance(0.35)) loot.push('¥'); // ibland en dryck
      if (!putAt(r.cx, r.cy, loot[0])) place(r, loot[0], 1, { center: true });
      for (const ch of loot.slice(1)) place(r, ch, 1, {});
      if (!place(r, 'c', 1, { corner: true }).length) place(r, 'j', 1, {});
    }
    // NPC (alkemist/präst): helst vid en vägg nära rummets mitt med fritt golv framför, annars var som helst där den inte stänger av något
    function npc(r, ch, R) {
      const front = (x, y) => [0, 1, 2, 3].some(k => isWall(g[y + DY[k]][x + DX[k]]) && g[y - DY[k]][x - DX[k]] === '.' && lock[(y - DY[k]) * W + x - DX[k]] < 2);
      return place(r, ch, 1, { wall: true, center: true, jit: 2, pred: front, rng: R })[0] || place(r, ch, 1, { center: true, rng: R })[0] || place(r, ch, 1, { rng: R })[0] || null;
    }
    // viloplats (lägerrum, version 6): lägereld ¶ i mitten med fri framsida, kött ð vid elden, lådor i hörnen
    function restSite(r) {
      const f = place(r, '¶', 1, { open: true, center: true, jit: 1.5 })[0] || place(r, '¶', 1, { center: true })[0] || place(r, '¶', 1, {})[0];
      place(r, 'ð', rng.int(1, 2), f ? { near: [f[0], f[1], 3] } : {});
      place(r, 'T', rng.int(1, 2), { corner: true, spread: 2 });
      if (rng.chance(0.5)) place(r, 'c', 1, { wall: true });
    }
    // pelarrader (version 7, pelarsalen): två rader längs långsidan (smala salar: en i mitten), varannan ruta, två rutor från väggarna
    function pillars(r, ch) {
      const b = r.box, hz = b.w >= b.h, A = hz ? b.w : b.h, B = hz ? b.h : b.w, done = [];
      for (const o of B >= 7 ? [2, B - 3] : [B >> 1]) for (let a = 2; a <= A - 3; a += 2) {
        const x = hz ? b.x + a : b.x + o, y = hz ? b.y + o : b.y + a, i = y * W + x;
        if (!G.inb(x, y) || rid[i] !== r.id || g[y][x] !== '.' || lock[i] || resv[i] || !localOK(G, x, y)) continue;
        set(x, y, ch); done.push([x, y]);
      }
      return done;
    }
    // hyllrader (version 13, biblioteket): rader av fristående hyllor (1 ruta tjocka) längs salens långsida med en gång emellan och luckor om 1-2
    // rutor; varje hyllsträcka (2-4 rutor) sätts bara om allt som nåddes förut nås ändå (flood fill från P, generatorns hinder), aldrig på låsta
    // rutor (dörrframsidor o.d.) och aldrig intill en kruka, spikfälla eller lava som då skulle stängas in. p: sannolikheten för varje rad
    let reachMemo = 0, rSeen = null, rQ = null;
    function reachN() {
      const N = W * G.H; if (!rSeen) { rSeen = new Uint8Array(N); rQ = new Int32Array(N); } else rSeen.fill(0);
      let qh = 0, qt = 0, n = 0; const s0 = P[1] * W + P[0]; rSeen[s0] = 1; rQ[qt++] = s0;
      while (qh < qt) {
        const cur = rQ[qh++], x = cur % W, y = (cur / W) | 0; n++;
        for (let d = 0; d < 4; d++) {
          const nx = x + DX[d], ny = y + DY[d], ni = ny * W + nx;
          if (nx < 0 || ny < 0 || nx >= W || ny >= G.H || rSeen[ni] || genBlk(g[ny][nx])) continue;
          rSeen[ni] = 1; rQ[qt++] = ni;
        }
      }
      return n;
    }
    function stacks(r, ch, p) {
      const b = r.box, hz = b.w >= b.h, A = hz ? b.w : b.h, B = hz ? b.h : b.w, done = [];
      if (A < 5 || B < 5 || r.type === 'start') return done;
      reachMemo = reachN(); // (rekvisita kan ha tillkommit sedan förra salen)
      const encloses = (x, y) => [0, 1, 2, 3].some(d => { // en kruka/spikfälla/lavaruta intill skulle tappa sin sista fria granne
        const nx = x + DX[d], ny = y + DY[d], c = g[ny][nx];
        if (!genBlk(c) || isBlock(c)) return false;
        return ![0, 1, 2, 3].some(e => { const mx = nx + DX[e], my = ny + DY[e]; return (mx !== x || my !== y) && !genBlk(G.at(mx, my)); });
      });
      // rader varannan linje: två rutor från långväggarna (udda bredd) eller en ruta från dem (jämn bredd, fler rader); får ingen rad plats
      // (utgången, dörrarnas gångar o.d. står i vägen) prövas den andra uppsättningen
      const sets = [[], []];
      for (let o = 2; o <= B - 3; o += 2) sets[0].push(o);
      for (let o = 1; o <= B - 2; o += 2) sets[1].push(o);
      if (B % 2 === 0) sets.reverse();
      for (const set of sets) {
        if (done.length) break;
        for (const o of set) {
          if (!rng.chance(p)) continue;
          let a = 1 + rng.int(0, 1);
          while (a <= A - 2) {
            const len = rng.int(2, 4), seg = [];
            for (let k = 0; k < len && a + k <= A - 2; k++) {
              const x = hz ? b.x + a + k : b.x + o, y = hz ? b.y + o : b.y + a + k, i = y * W + x;
              if (!G.inb(x, y) || rid[i] !== r.id || g[y][x] !== '.' || lock[i] || resv[i] || encloses(x, y)) break;
              seg.push([x, y]);
            }
            if (seg.length < 2) { a += seg.length + 1; continue; } // (förbi rutan som stod i vägen)
            a += seg.length + rng.int(1, 2);
            for (const [x, y] of seg) g[y][x] = ch;
            const n = reachN();
            if (n !== reachMemo - seg.length) { for (const [x, y] of seg) g[y][x] = '.'; continue; }
            reachMemo = n;
            for (const [x, y] of seg) { cnt[ch] = (cnt[ch] || 0) + 1; done.push([x, y]); }
          }
        }
      }
      return done;
    }
    // kanal med smält metall (version 13, gjuteriet): rak kanal (1-2 bred) tvärs över salen med en spång (1-2 rutor) där man går över; varje ruta
    // läggs med localOK (aldrig enda vägen), aldrig på låsta rutor, intill P/x eller vid dörrar. Under 3 rutor: ingen kanal alls
    function canal(r, ch) {
      for (let t = 0; t < 3; t++) { const n = canal1(r, ch); if (n) return n; }
      return 0;
    }
    function canal1(r, ch) {
      const b = r.box;
      if (b.w < 5 || b.h < 5) return 0;
      const vert = rng.chance(0.5), A = vert ? b.h : b.w, B = vert ? b.w : b.h;
      const wide = B >= 7 && rng.chance(0.5) ? 2 : 1, o = rng.int(1, B - 1 - wide), br = rng.int(1, A - 3), bw = rng.int(1, 2), cells = [];
      for (let a = 0; a < A; a++) {
        if (a >= br && a < br + bw) continue; // spången
        for (let t = 0; t < wide; t++) {
          const x = vert ? b.x + o + t : b.x + a, y = vert ? b.y + a : b.y + o + t, i = y * W + x;
          if (!G.inb(x, y) || rid[i] !== r.id || g[y][x] !== '.' || lock[i] || cheb(x, y, P[0], P[1]) <= 1 || cheb(x, y, X[0], X[1]) <= 1
            || RX.some((dx, k) => isDoorCh(G.at(x + dx, y + RY[k]))) || !localOK(G, x, y)) continue;
          set(x, y, ch); cells.push([x, y]);
        }
      }
      // lösa rutor (utan granne i kanalen) tas bort igen: kanalen består av raka sträckor
      const kept = cells.filter(([x, y]) => cells.some(p => Math.abs(p[0] - x) + Math.abs(p[1] - y) === 1));
      for (const c of cells) if (!kept.includes(c)) { g[c[1]][c[0]] = '.'; cnt[ch]--; }
      if (kept.length < 3) { for (const [x, y] of kept) g[y][x] = '.'; cnt[ch] -= kept.length; return 0; }
      return kept.length;
    }
    // ----- version 15/16: hjälpare för katedralens, trädgårdens och drömrikets rumstyper (bara i de nya biomerna) -----
    // en kruka/spikfälla/lavaruta intill (x, y) skulle tappa sin sista fria granne om (x, y) blev ett hinder
    const encl = (x, y) => [0, 1, 2, 3].some(d => {
      const nx = x + DX[d], ny = y + DY[d], c = g[ny][nx];
      if (!genBlk(c) || isBlock(c)) return false;
      return ![0, 1, 2, 3].some(e => { const mx = nx + DX[e], my = ny + DY[e]; return (mx !== x || my !== y) && !genBlk(G.at(mx, my)); });
    });
    const doorNear8 = (x, y) => RX.some((dx, k) => isDoorCh(G.at(x + dx, y + RY[k])));
    // långhusets bänkrader (version 15): mittgång (röd matta) längs salen, bänkar Ǝ i par tvärs över salen var annan rad (sidogångarna längs väggarna
    // fria), koret i ena kortänden fritt med ett altare/en staty och ljus; varje bänkhalva sätts bara om allt som nåddes förut nås ändå
    function pews(r) {
      const b = r.box, hz = b.w >= b.h, A = hz ? b.w : b.h, B = hz ? b.h : b.w, done = [];
      if (A < 9 || B < 5) return done;
      const xy = (a, o) => (hz ? [b.x + a, b.y + o] : [b.x + o, b.y + a]);
      const aisle = B % 2 ? [(B - 1) >> 1] : [B / 2 - 1, B / 2], lo = Math.min(...aisle), hi = Math.max(...aisle);
      const ci = floorIdx('floor_carpet');
      if (ci >= 0) for (let a = 0; a < A; a++) for (const o of aisle) { const [x, y] = xy(a, o); if (rid[y * W + x] === r.id && !isWall(g[y][x])) fm[y * W + x] = ci; }
      const choir = rng.chance(0.5) ? A - 1 : 0, dir = choir ? -1 : 1; // koret: kortänden a = choir
      reachMemo = reachN();
      for (let a = choir ? 2 : A - 3; choir ? a <= A - 4 : a >= 3; a += choir ? 2 : -2) for (const [o0, o1] of [[1, lo - 1], [hi + 1, B - 2]]) {
        const seg = [];
        for (let o = o0; o <= o1; o++) {
          const [x, y] = xy(a, o), i = y * W + x;
          if (!G.inb(x, y) || rid[i] !== r.id || g[y][x] !== '.' || lock[i] || resv[i] || encl(x, y)) { seg.length = 0; break; }
          seg.push([x, y]);
        }
        if (!seg.length) continue;
        for (const [x, y] of seg) g[y][x] = 'Ǝ';
        const n = reachN();
        if (n !== reachMemo - seg.length) { for (const [x, y] of seg) g[y][x] = '.'; continue; }
        reachMemo = n;
        for (const [x, y] of seg) { cnt['Ǝ'] = (cnt['Ǝ'] || 0) + 1; done.push([x, y]); }
      }
      // koret: altaret (om banan får ett) eller en staty vid kortväggen, ljus bredvid
      const [ax, ay] = xy(choir + dir, aisle[0]);
      const alt = place(r, L.altar && can('y') ? 'y' : 'u', 1, { near: [ax, ay, 2.5], jit: 0.5 })[0];
      if (alt) place(r, 'c', rng.int(1, 2), { near: [alt[0], alt[1], 2] });
      return done;
    }
    // murad trädgård (version 16): biomens väggar (häck) runt rummet blir trädgårdsmur, utom vid den hemliga/spruckna väggen
    function rewall(r, ch) {
      const wc = L.vaultWall; let n = 0;
      for (const [x, y] of r.cells) for (let k = 0; k < 8; k++) {
        const xx = x + RX[k], yy = y + RY[k];
        if (G.at(xx, yy) !== wc) continue;
        let hid = false; for (let q = 0; q < 8 && !hid; q++) { const c = G.at(xx + RX[q], yy + RY[q]); if (c === '*' || c === '{') hid = true; }
        if (!hid) { g[yy][xx] = ch; n++; }
      }
      return n;
    }
    // schackbräde (version 16): varannan ruta i golvtexturen name
    function checker(r, name) {
      const k = floorIdx(name); if (k < 0) return 0;
      let n = 0; for (const [x, y] of r.cells) if (((x + y) & 1) && !isWall(g[y][x])) { fm[y * W + x] = k; n++; }
      return n;
    }
    // glidande väggar (version 16, drömriket): rader av ƣ (1 ruta tjocka, sträckor om 2-3) längs salens långsida, en fas per sträcka (G.shifts);
    // aldrig på låsta eller reserverade rutor, aldrig intill en dörr/grind/hemlig vägg (de åtta grannarna) eller inom 2 rutor från P och x, och varje
    // sträcka sätts bara om allt som nåddes förut nås ändå med väggen uppe (flood fill med ƣ som vägg)
    function shifts(r, p) {
      const b = r.box, hz = b.w >= b.h, A = hz ? b.w : b.h, B = hz ? b.h : b.w, done = [];
      if (A < 5 || B < 5 || r.type === 'start') return done;
      reachMemo = reachN();
      for (let o = 2; o <= B - 3; o += 2) {
        if (!rng.chance(p)) continue;
        let a = 1 + rng.int(0, 1);
        while (a <= A - 2) {
          const len = rng.int(2, 3), seg = [];
          for (let k = 0; k < len && a + k <= A - 2; k++) {
            const x = hz ? b.x + a + k : b.x + o, y = hz ? b.y + o : b.y + a + k, i = y * W + x;
            if (!G.inb(x, y) || rid[i] !== r.id || g[y][x] !== '.' || lock[i] || resv[i] || encl(x, y) || doorNear8(x, y)
              || cheb(x, y, P[0], P[1]) <= 2 || cheb(x, y, X[0], X[1]) <= 2) break;
            seg.push([x, y]);
          }
          if (seg.length < 2) { a += seg.length + 1; continue; }
          a += seg.length + rng.int(1, 2);
          for (const [x, y] of seg) g[y][x] = SHIFT16;
          const n = reachN();
          if (n !== reachMemo - seg.length) { for (const [x, y] of seg) g[y][x] = '.'; continue; }
          reachMemo = n;
          const ph = rng.int(0, 39) / 10;
          for (const [x, y] of seg) { cnt[SHIFT16] = (cnt[SHIFT16] || 0) + 1; done.push([x, y]); G.shifts.push({ x, y, ph }); }
        }
      }
      return done;
    }
    // fri framsida: en vägg bakom och fritt golv framför (pulpet, falsk dörr)
    const front = (x, y) => [0, 1, 2, 3].some(k => isWall(g[y + DY[k]][x + DX[k]]) && g[y - DY[k]][x - DX[k]] === '.' && lock[(y - DY[k]) * W + x - DX[k]] < 2);
    const F = { int: (a, b) => rng.int(a, b), chance: p => rng.chance(p), place, putAt, shelves, row, grid, ring, stalls, focal, chest, vault, npc, restSite, pillars, stacks, canal,
      pews, rewall, checker, shifts, front,
      nextTo: ch => (x, y) => g[y - 1][x] === ch || g[y + 1][x] === ch || g[y][x - 1] === ch || g[y][x + 1] === ch };

    // ----- farliga golv och fällor (körs sist, när fiender och föremål redan står på plats) -----
    // aldrig på/intill P och x (is/vatten/väv får ligga i dörrpassager, fällor och lava aldrig); lava sätts bara där den inte stänger av något (localOK räknar lava som hinder)
    const nearPX = (x, y) => cheb(x, y, P[0], P[1]) <= 1 || cheb(x, y, X[0], X[1]) <= 1;
    const hzFree = r => r.cells.filter(([x, y]) => g[y][x] === '.' && !nearPX(x, y));
    const wallInLine = (x, y) => { // pilplatta: en vägg inom 6 rutor i rak linje (fri sikt)
      for (let d = 0; d < 4; d++) for (let k = 1; k <= 6; k++) { const c = G.at(x + DX[d] * k, y + DY[d] * k); if (isWall(c)) return true; if (isBlock(c)) break; }
      return false;
    };
    const trapOK = (x, y) => g[y][x] === '.' && !lock[y * W + x] && !nearPX(x, y) && ![0, 1, 2, 3].some(d => isDoorCh(g[y + DY[d]][x + DX[d]]));
    // version 8: djupt vatten (Đ) stänger aldrig in en kruka, spikfälla o.d.: de behåller en fri granne (gäller bara Đ, så äldre biomer är som förut)
    const wetOK = (ch, x, y) => ch !== 'Đ' || [0, 1, 2, 3].every(d => {
      const nx = x + DX[d], ny = y + DY[d], c = g[ny][nx];
      if (!genBlk(c) || isBlock(c) || isWet(c)) return true;
      return [0, 1, 2, 3].some(e => { const mx = nx + DX[e], my = ny + DY[e]; return (mx !== x || my !== y) && !genBlk(G.at(mx, my)); });
    });
    const Z = {
      int: (a, b) => rng.int(a, b), range: (a, b) => rng.range(a, b), chance: p => rng.chance(p),
      // fläck som växer från en slumpad ruta (walls: hellre längs väggarna och i hörnen)
      blob(r, ch, frac, o) {
        const fc = hzFree(r); if (!fc.length) return 0;
        const s = rng.pick(fc), n = Math.min(o && o.max || 1e9, Math.max(1, Math.round(fc.length * frac)));
        const key = ([x, y]) => (o && o.walls ? 3 - 1.5 * nWall(x, y) : Math.hypot(x - s[0], y - s[1])) + rng.next() * 2.2;
        const ord = fc.map(p => [p[0], p[1], key(p)]).sort((a, b) => a[2] - b[2]);
        for (let k = 0; k < n; k++) set(ord[k][0], ord[k][1], ch);
        return n;
      },
      ringAt(r, ch, c, r0, r1) {
        let n = 0;
        for (const [x, y] of hzFree(r)) { const d = Math.hypot(x - c[0], y - c[1]); if (d >= r0 && d <= r1) { set(x, y, ch); n++; } }
        return n;
      },
      // lavaflod tvärs över rummet (slingrar, 1-2 bred); rutor som skulle stänga av något blir broar
      river(r, ch) {
        const b = r.box, vert = b.w >= b.h, L = vert ? b.h : b.w, A0 = vert ? b.y : b.x;
        let c = (vert ? r.cx : r.cy) + rng.int(-1, 1), n = 0;
        const wide = rng.chance(0.75);
        for (let k = 0; k < L; k++) {
          if (rng.chance(0.4)) c += rng.chance(0.5) ? 1 : -1;
          for (let t = 0; t < (wide ? 2 : 1); t++) {
            const x = vert ? c + t : A0 + k, y = vert ? A0 + k : c + t;
            if (!G.inb(x, y) || rid[y * W + x] !== r.id || g[y][x] !== '.' || lock[y * W + x] || nearPX(x, y) || !localOK(G, x, y) || !wetOK(ch, x, y)) continue;
            set(x, y, ch); n++;
          }
        }
        return n;
      },
      pool(r, ch, rad) {
        const fc = hzFree(r); if (!fc.length) return 0;
        const s = rng.pick(fc); let n = 0;
        for (const [x, y] of fc.filter(([x, y]) => Math.hypot(x - s[0], y - s[1]) <= rad).sort((a, b) => Math.hypot(a[0] - s[0], a[1] - s[1]) - Math.hypot(b[0] - s[0], b[1] - s[1]))) {
          if (g[y][x] !== '.' || lock[y * W + x] || !localOK(G, x, y) || !wetOK(ch, x, y)) continue;
          set(x, y, ch); n++;
        }
        return n;
      },
      // istappar: rutor intill en vägg (inte vid dörrar, P eller x), inte bredvid varandra
      icicles(r, n) {
        let k = 0;
        for (const [x, y] of rng.shuffle(r.cells.slice())) {
          if (k >= n || !can('Ç')) break;
          if (!trapOK(x, y) || !nWall(x, y) || nearCh(x, y, 'Ç', 1)) continue;
          set(x, y, 'Ç'); k++;
        }
        return k;
      },
      // lavasjö (vulkanen): ellips som fyller rummet utom en kant, med en rak bro (golv) tvärs genom mitten
      lake(r, ch) {
        const b = r.box, hz = rng.chance(0.5), mx = b.x + (b.w - 1) / 2, my = b.y + (b.h - 1) / 2, rx = Math.max(1.5, b.w / 2 - 1), ry = Math.max(1.5, b.h / 2 - 1);
        const bridge = (x, y) => (hz ? y === r.cy || (b.h >= 9 && y === r.cy + 1) : x === r.cx || (b.w >= 9 && x === r.cx + 1));
        let n = 0;
        const c = hzFree(r).filter(([x, y]) => !bridge(x, y) && ((x - mx) / rx) ** 2 + ((y - my) / ry) ** 2 <= 1 + (rng.next() - 0.5) * 0.3)
          .sort((p, q) => Math.hypot(p[0] - mx, p[1] - my) - Math.hypot(q[0] - mx, q[1] - my));
        for (const [x, y] of c) if (g[y][x] === '.' && !lock[y * W + x] && localOK(G, x, y) && wetOK(ch, x, y)) { set(x, y, ch); n++; }
        return n;
      },
      traps(r, ch, n) {
        let k = 0;
        for (const [x, y] of rng.shuffle(r.cells.slice())) {
          if (k >= n || !can(ch)) break;
          if (!trapOK(x, y) || (ch === '<' && !wallInLine(x, y)) || nearCh(x, y, ch, 1)) continue;
          set(x, y, ch); k++;
        }
        return k;
      },
    };

    const normal = () => rooms.filter(r => r.type === 'normal');
    const isCombat = r => r.type === 'normal' || r.type === 'exit' || r.type === 'elite';
    for (const r of rooms) { r.far = 0; for (const [x, y] of r.cells) if (g[y][x] === '.' && lock[y * W + x] < 2 && farFromP(x, y)) r.far++; }
    const maxD = Math.max(1, ...rooms.map(r => r.d || 0));
    L.altar = rng.chance(0.35);
    // ----- kapacitet: ett rum får bara bli valv/specialrum om stridsrummen ändå rymmer våningens fiender -----
    const capOf = q => (q.far >= 4 ? Math.min(5, Math.max(2, Math.floor(q.far / 4))) : 0);
    const needCap = 3 * depth + 9;
    const spareRoom = (q, extra) => q.far < 4 || rooms.reduce((n, a) => n + (isCombat(a) && a !== q ? capOf(a) : 0), 0) >= needCap + (extra || 0);
    // ----- specialrum utan fiender: spåaltare, offerskål, utmaningsaltare (öppen sal >= 7x7) och smedja (väljs före de andra rollerna) -----
    const wantAnvil = rng.chance(0.4);
    const roomy = L.biome === 'dungeon' || L.biome === 'courtyard' || L.biome === 'frost' || L.biome === 'volcano' || L.biome === 'tomb' || L.biome === 'sunken' || L.biome === 'clock' || L.biome === 'mirror' || L.biome === 'library' || L.biome === 'foundry'
      || L.biome === 'cathedral' || L.biome === 'dream'; // biomer med möblerade salar inomhus
    const v6 = rng.fork('v6'); // version 6: eget slumpflöde så att banor utan de nya sakerna blir som förut
    let anvilArmory = wantAnvil && roomy && rng.chance(0.5);
    const npcLeft = []; // NPC:er som inte fick ett eget rum (hamnar i butiken eller ett annat specialrum)
    {
      const openShape = q => !q.shape || q.shape === 'rect' || q.shape === 'round' || q.shape === 'pillars' || q.shape === 'L';
      const dots = q => q.cells.reduce((n, [x, y]) => n + (g[y][x] === '.' ? 1 : 0), 0);
      let spot = q => q.cells.filter(([x, y]) => g[y][x] === '.' && !lock[y * W + x] && localOK(G, x, y)).length >= 3; // plats för altaret/städet
      const spotMemo = new Map(), spot0 = spot;
      spot = q => { if (!spotMemo.has(q)) spotMemo.set(q, spot0(q)); return spotMemo.get(q); };
      const SP = [['fortune', 0.36, q => size(q) >= 9], ['offering', 0.36, q => size(q) >= 9],
        ['challenge', L.biome === 'dungeon' ? 0.7 : 0.3, q => q.box.w >= 7 && q.box.h >= 7 && openShape(q) && dots(q) >= 30], ['smithy', wantAnvil && !anvilArmory ? 1 : 0, q => size(q) >= 12],
        // NPC-rum: alkemisten (~30 %) och prästen (~25 %) i små rum; på kyrkogården helst i kapellet
        ['alchemy', 0.31, q => size(q) >= 10 && size(q) <= 64], ['chapel2', 0.26, q => size(q) >= 14 && size(q) <= 90]];
      const npcRoom = id => id === 'alchemy' || id === 'chapel2'; // NPC-rummen kräver mer marginal för våningens fiender
      const pref = (id, q) => (id === 'chapel2' ? (q.tag === 'chapel' ? 0 : 1) : id === 'alchemy' ? Math.min(1, size(q) / 64) : 0);
      for (const [id, p, fits] of rng.shuffle(SP)) {
        if (!rng.chance(p)) continue;
        const c = rng.shuffle(normal().filter(q => !q.nave && fits(q) && spot(q) && spareRoom(q, 4 + (opts.shop ? 3 : 0) + (npcRoom(id) ? 2 : 0)))).sort((a, b) => (a.far < 4 ? 0 : 2) + pref(id, a) - (b.far < 4 ? 0 : 2) - pref(id, b));
        if (c.length) { c[0].type = 'special'; c[0].special = id; } else if (id === 'smithy') anvilArmory = true; else if (id === 'alchemy') npcLeft.push('£'); else if (id === 'chapel2') npcLeft.push('€');
      }
      // version 6: viloplats (~25 % av våningarna): ett litet rum utan fiender (helst ett återvändsrum) med en lägereld ¶
      if (!(opts.v6 && opts.v6.noCamp) && v6.chance(0.34)) {
        const c = v6.shuffle(normal().filter(q => !q.nave && size(q) >= 9 && size(q) <= 64 && spot(q) && spareRoom(q, 2 + (opts.shop ? 3 : 0))))
          .sort((a, b) => (a.deg === 1 ? 0 : 1) + (a.far < 4 ? 0 : 1) - (b.deg === 1 ? 0 : 1) - (b.far < 4 ? 0 : 1));
        if (c.length) { c[0].type = 'special'; c[0].special = 'camp'; if (opts.v6) opts.v6.camp = true; }
      }
    }

    // ----- valv: spakvalv (bara järngrindar | in, spaken / i ett annat rum) och låst valv (låst dörr ], nyckeln } någon annanstans) -----
    // antingen förseglas ett återvändsrum vars enda utgång är en dörr/öppning med väggar på båda sidor, eller så huggs en
    // 3x3-kammare ut ur massiv vägg (L.vaultWall) bredvid ett rum
    {
      // rummets utgångar (högst maxEx), om alla är dörrar/öppningar med väggar på båda sidor; med flera utgångar får
      // förseglingen inte stänga av något annat rum
      const gateable = (q, maxEx) => {
        const ex = [];
        for (const [x, y] of q.cells) for (let d = 0; d < 4; d++) {
          const nx = x + DX[d], ny = y + DY[d], ni = ny * W + nx;
          if (rid[ni] === q.id || isWall(g[ny][nx]) || ex.includes(ni)) continue;
          if (ex.length >= maxEx) return null;
          ex.push(ni);
        }
        if (!ex.length) return null;
        const out = [];
        for (const i of ex) { const gt = gateCell(q, i); if (!gt) return null; out.push(gt); }
        if (out.length > 1) {
          const seen = new Uint8Array(W * G.H), st = [P[1] * W + P[0]];
          for (const [x, y] of q.cells) seen[y * W + x] = 2;
          for (const gt of out) seen[gt.y * W + gt.x] = 2;
          seen[st[0]] = 1;
          while (st.length) { const c = st.pop(); for (let d = 0; d < 4; d++) { const ni = c + DX[d] + DY[d] * W; if (!seen[ni] && !genBlk(g[(ni / W) | 0][ni % W])) { seen[ni] = 1; st.push(ni); } } }
          for (const a of rooms) if (a !== q && a.type !== 'secret' && a.cells.some(([x, y]) => !seen[y * W + x] && !genBlk(g[y][x]))) return null;
        }
        return out;
      };
      const gateCell = (q, ex) => {
        if (rid[ex] >= 0) return null;
        const x = ex % W, y = (ex / W) | 0, c = g[y][x];
        if (c !== 'D' && c !== 'G' && c !== '.') return null;
        const ew = isWall(g[y][x - 1]) && isWall(g[y][x + 1]), ns = isWall(g[y - 1][x]) && isWall(g[y + 1][x]);
        if (ew === ns) return null;
        let inn = ew ? [x, y - 1] : [x - 1, y], out = ew ? [x, y + 1] : [x + 1, y];
        if (rid[inn[1] * W + inn[0]] !== q.id) [inn, out] = [out, inn];
        if (rid[inn[1] * W + inn[0]] !== q.id || rid[out[1] * W + out[0]] === q.id || isBlock(g[inn[1]][inn[0]]) || isBlock(g[out[1]][out[0]])) return null;
        return { x, y, inn, out };
      };
      const seal = (q, gts, kind) => {
        for (const gt of gts) {
          g[gt.y][gt.x] = kind === 'lever' ? '|' : ']';
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) G.lockMin(gt.x + dx, gt.y + dy, 1);
          G.lockMin(gt.inn[0], gt.inn[1], 2); G.lockMin(gt.out[0], gt.out[1], 2);
        }
        q.type = 'vault'; q.lock = kind; q.door = [gts[0].x, gts[0].y];
        return q;
      };
      const pocket = kind => {
        const wc = L.vaultWall; if (!wc) return null;
        const src = [];
        for (const q of rooms) if (q.type !== 'guardian' && q.type !== 'secret' && q.type !== 'vault') for (const [x, y] of q.cells) {
          const i = y * W + x;
          if (g[y][x] !== '.' || lock[i] || G.res[i] || cheb(x, y, P[0], P[1]) < 3) continue;
          for (let d = 0; d < 4; d++) if (G.inb(x + DX[d], y + DY[d]) && g[y + DY[d]][x + DX[d]] === wc) src.push([x, y, d, q]);
        }
        rng.shuffle(src);
        for (let t = 0; t < 3 * src.length && t < 600; t++) {
          const [x, y, d, q] = src[(t / 3) | 0], i = y * W + x, ox = x + DX[d], oy = y + DY[d], k = t % 3;
          let ix, iy;
          if (d === 0) { ix = ox + 1; iy = y - k; } else if (d === 2) { ix = ox - 3; iy = y - k; }
          else if (d === 1) { iy = oy + 1; ix = x - k; } else { iy = oy - 3; ix = x - k; }
          if (ix < 1 || iy < 1 || ix + 3 > W - 1 || iy + 3 > G.H - 1) continue;
          let ok = true;
          for (let yy = iy - 1; ok && yy <= iy + 3; yy++) for (let xx = ix - 1; xx <= ix + 3; xx++) if (g[yy][xx] !== wc) { ok = false; break; }
          if (!ok) continue;
          const skyV = L.biome === 'frost' || L.biome === 'volcano' || L.biome === 'tomb' || L.biome === 'sunken' ? 0 : G.sky[i], cells = [], id = rooms.length; // frostfästets, vulkanens, gravkammarens och sjunkna stadens valv har tak
          for (let yy = iy; yy < iy + 3; yy++) for (let xx = ix; xx < ix + 3; xx++) {
            const j = yy * W + xx;
            g[yy][xx] = '.'; fm[j] = fm[i]; G.sky[j] = skyV; G.solid[j] = 0; G.lockMin(xx, yy, 1); rid[j] = id; cells.push([xx, yy]);
          }
          g[oy][ox] = kind === 'lever' ? '|' : ']'; G.sky[oy * W + ox] = skyV;
          markDoor(G, ox, oy, x, y, ox + DX[d], oy + DY[d]);
          const rec = { id, type: 'vault', tag: 'vault', lock: kind, cells, cx: ix + 1, cy: iy + 1, box: { x: ix, y: iy, w: 3, h: 3 }, d: q.d || 0, indoor: !skyV, door: [ox, oy], far: 0 };
          rooms.push(rec);
          return rec;
        }
        return null;
      };
      for (const kind of ['lever', 'key']) {
        if (!rng.chance(L.biome === 'dungeon' ? 0.31 : 0.38)) continue;
        let v = null;
        if (rng.chance(L.biome === 'dungeon' ? 0.65 : 1)) {
          const c = rng.shuffle(rooms.filter(q => q.type === 'normal' && size(q) <= (L.biome === 'courtyard' ? 70 : 45) && spareRoom(q, 4 + (opts.shop ? 3 : 0)))).sort((a, b) => (a.far < 4 ? 0 : 1) - (b.far < 4 ? 0 : 1));
          for (const q of c) { const gt = gateable(q, kind === 'lever' ? 2 : 1); if (gt) { v = seal(q, gt, kind); break; } }
        }
        if (!v) v = pocket(kind);
        if (!v) continue;
        // spaken (vid en vägg) eller nyckeln (långt från P) i ett annat rum som nås med alla grindar stängda
        const ch = kind === 'lever' ? '/' : '}';
        const others = rng.shuffle(rooms.filter(q => q !== v && q.type !== 'vault' && q.type !== 'secret' && q.type !== 'guardian'))
          .sort((a, b) => (a.type === 'start' ? 1 : 0) - (b.type === 'start' ? 1 : 0));
        if (!others.some(q => place(q, ch, 1, kind === 'lever' ? { wall: true } : { far: true }).length || (kind === 'key' && place(q, ch, 1, {}).length))) return null;
      }
    }
    // ----- vaktarens sal: Z i mitten med fri 5x5, ljuskällor och tematisk dekor längs kanterna -----
    const gRoom = rooms.find(r => r.type === 'guardian');
    {
      const sp = GUARDIANS[L.gid], [zx, zy] = L.guardian.center;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) G.lockMin(zx + dx, zy + dy, 2);
      if (!gRoom || g[zy][zx] !== '.' || rid[zy * W + zx] !== gRoom.id) return null;
      set(zx, zy, 'Z');
      gRoom.cx = zx; gRoom.cy = zy;
      const nl = L.gid === 'beast' ? 4 : rng.int(2, 4);
      let lit = place(gRoom, sp.light, nl, { wall: true, spread: 4 }).length;
      if (lit < 2) lit += place(gRoom, sp.light, 2 - lit, { spread: 3 }).length;
      if (lit < 2) return null;
      for (const ch of rng.shuffle(sp.decor.split(''))) if (!place(gRoom, ch, 1, { wall: true, spread: 2, avoid: [ch, 1] }).length) place(gRoom, ch, 1, {});
      place(gRoom, 'h', 1, { wall: true }); place(gRoom, 'a', 1, { wall: true });
      // version 8: leviatans sal får en bassäng (djupt vatten Đ, 5-13 rutor) minst tre rutor från Z (eget slumpflöde)
      if (L.gid === 'leviathan') {
        const R = rngMain.fork('v8-leviathan'), dw = floorIdx('floor_deepwater');
        const okW = (x, y) => g[y][x] === '.' && !lock[y * W + x] && rid[y * W + x] === gRoom.id && cheb(x, y, zx, zy) >= 3 && localOK(G, x, y);
        let done = 0;
        for (const s of R.shuffle(gRoom.cells.filter(([x, y]) => okW(x, y) && cheb(x, y, zx, zy) >= 4)).slice(0, 12)) {
          const rad = R.range(1.5, 2.3), pool = [];
          for (const [x, y] of gRoom.cells.filter(([x, y]) => Math.hypot(x - s[0], y - s[1]) <= rad).sort((a, b) => Math.hypot(a[0] - s[0], a[1] - s[1]) - Math.hypot(b[0] - s[0], b[1] - s[1])))
            if (okW(x, y)) { g[y][x] = 'Đ'; pool.push([x, y]); }
          if (pool.length >= 5) { for (const [x, y] of pool) { cnt['Đ'] = (cnt['Đ'] || 0) + 1; if (dw >= 0) fm[y * W + x] = dw; } done = pool.length; break; }
          for (const [x, y] of pool) g[y][x] = '.';
        }
        if (!done) return null;
      }
    }

    // ----- köpman: mot en vägg med fritt golv framför sig, i den närmare halvan av banan -----
    if (opts.shop) {
      const front = (x, y) => { for (let k = 0; k < 4; k++) { const fx = x - DX[k], fy = y - DY[k]; if (isWall(g[y + DY[k]][x + DX[k]]) && g[fy][fx] === '.' && lock[fy * W + fx] < 2) return [fx, fy]; } return null; };
      const c = normal().filter(a => !a.nave && size(a) >= 12).sort((a, b) => a.d - b.d); // (version 15: aldrig i katedralens långhus)
      const pool = rng.shuffle(c.slice(0, Math.max(1, Math.ceil(c.length / 2))));
      pool.sort((a, b) => (a.far < 4 ? 0 : 1) - (b.far < 4 ? 0 : 1)); // rum där inga fiender får stå passar bäst
      let shop = null;
      for (const a of pool.concat(c)) {
        const m = place(a, 'M', 1, { center: true, pred: (x, y) => front(x, y) && cheb(x, y, P[0], P[1]) >= 3 })[0];
        if (m) { const f = front(m[0], m[1]); G.lockMin(f[0], f[1], 2); shop = a; F.shopAt = m; break; }
      }
      if (!shop) return null;
      shop.type = 'shop';
    }
    // ----- kortkista: helst i en utsedd byggnad/glänta (taggarna i prioritetsordning), annars ett avlägset rum -----
    {
      const tags = cfg.treasureTags || [];
      let c = [];
      for (const t of tags) { c = normal().filter(a => a.tag === t); if (c.length) break; }
      if (!c.length) c = normal().filter(a => !a.nave && size(a) >= 8);
      const t = rng.weighted(c, a => (1 + 2 * a.d / maxD) * (cfg.deadEnd && a.deg === 1 ? 3 : 1) * (a.far < 4 ? 4 : 1));
      if (!t || !place(t, 'C', 1, { center: true }).length) return null;
      t.type = 'treasure';
      if (tags.length) for (const a of normal().filter(a => a.tag === tags[0])) if (rng.chance(cfg.extraChest || 0) && place(a, 'C', 1, { center: true }).length) a.type = 'treasure';
    }
    // ----- elitrum: avlägsna, olika rum, med plats för en grupp långt från P -----
    {
      const nElite = Math.max(1, Math.floor(depth / 2)), et = cfg.eliteTags || [];
      for (let i = 0; i < nElite; i++) {
        const c = normal().filter(a => a.far >= 4).sort((a, b) => b.d - a.d);
        const a = rng.weighted(c.slice(0, Math.max(1, Math.ceil(c.length * 0.6))), a => (et.includes(a.tag) ? 3 : 1) * Math.sqrt(size(a)));
        if (!a) { if (i === 0) return null; break; }
        a.type = 'elite';
      }
    }
    // ----- helgedom med helande brunn (halva banorna, och alltid för rum där inga fiender får stå) -----
    {
      const tooNear = () => normal().filter(a => a.far < 4);
      const spare = rooms.filter(a => (a.type === 'normal' && a.far >= 4) || a.type === 'exit' || a.type === 'elite').length - (1 + Math.ceil(depth / 2));
      if ((rng.chance(0.5) && spare > 0) || tooNear().length) {
        const st = cfg.shrineTags || [];
        let c = tooNear();
        if (!c.length) { c = normal().filter(a => st.includes(a.tag)); if (!c.length) c = normal().filter(a => !a.nave && size(a) >= 9); }
        for (const a of rng.shuffle(c.slice()).sort((u, v) => (st.includes(v.tag) ? 1 : 0) - (st.includes(u.tag) ? 1 : 0))) {
          const w = a.tag === 'fountain' && putAt(a.cx, a.cy, 'w') ? [a.cx, a.cy] : place(a, 'w', 1, { center: true, jit: 2 })[0];
          if (w) { a.type = 'shrine'; F.wellAt = w; break; }
        }
      }
      if (tooNear().length) return null;
    }

    // ----- rumstyper och möblering -----
    const used = {};
    const SPECIAL_ARCH = { start: 'start', guardian: 'guardian', shop: 'shop', shrine: 'shrine', treasure: 'vault', secret: 'secret' };
    for (const r of rooms) {
      if (r.type === 'special') { r.arch = r.special; continue; }
      if (r.type === 'vault') { r.arch = r.lock === 'lever' ? 'levervault' : 'lockedvault'; continue; }
      if (SPECIAL_ARCH[r.type]) { r.arch = r.tag === 'hut' && r.type === 'treasure' ? 'hut' : SPECIAL_ARCH[r.type]; continue; }
      const by = ARCH_BY[L.biome], list = (by[r.tag] || by.open || by.room).filter(([id]) => size(r) >= (ARCH[id].min || 0) && (!ARCH[id].fits || ARCH[id].fits(r)));
      r.arch = list.length ? rng.weighted(list, ([id, w]) => w / (1 + 2 * (used[id] || 0)))[0] : (by[r.tag] || by.open || by.room)[0][0];
      used[r.arch] = (used[r.arch] || 0) + 1;
    }
    // fångburen hamnar i ett fängelse (eller burrum/tortyrkammare); städet utan smedja i en vapenkammare (eller ett läger)
    const wantCage = rng.chance(0.3), CAGE_ARCH = ['prison', 'cages', 'torture'], ANVIL_ARCH = ['armory', 'camp', 'drill', 'storeroom'];
    const forceArch = (id, ok, pred) => {
      if (rooms.some(r => isCombat(r) && ok.includes(r.arch))) return;
      const c = rng.shuffle(rooms.filter(r => isCombat(r) && size(r) >= (ARCH[id].min || 0) && pred(r)));
      if (c.length) c[0].arch = id;
    };
    if (wantCage) forceArch('prison', CAGE_ARCH, r => r.tag !== 'yard'); // inget fängelse ute på frostfästets gårdar
    // version 13: biblioteket har alltid en läsesal eller hyllgång (om någon sal är stor nog), gjuteriet en gjuthall
    if (L.biome === 'library') forceArch('readingroom', ['readingroom', 'stacks'], r => ARCH.readingroom.fits(r));
    if (L.biome === 'foundry') forceArch('casting', ['casting'], r => ARCH.casting.fits(r));
    // version 15/16: katedralen har alltid sitt långhus (om det blev ett stridsrum), drömriket en sal med glidande väggar
    if (L.biome === 'cathedral') forceArch('nave', ['nave'], r => !!r.nave);
    if (L.biome === 'dream') forceArch('shifthall', ['shifthall'], r => ARCH.shifthall.fits(r));
    if (anvilArmory && roomy) forceArch('armory', ANVIL_ARCH, r => r.indoor);
    for (const r of rooms) {
      const A = ARCH[r.arch];
      if (A.floor && (A.paint || (r.indoor && roomy))) paint(r, A.floor);
      A.fill(r, F);
    }
    if (wantCage) for (const r of rng.shuffle(rooms.filter(isCombat)).sort((a, b) => (CAGE_ARCH.includes(b.arch) ? 1 : 0) - (CAGE_ARCH.includes(a.arch) ? 1 : 0)))
      if (place(r, '[', 1, { wall: true }).length || place(r, '[', 1, {}).length) break;
    if (anvilArmory && !cnt['(']) for (const r of rng.shuffle(rooms.filter(r => isCombat(r) && ANVIL_ARCH.includes(r.arch)))) if (place(r, '(', 1, { wall: true }).length) break;
    // NPC utan eget rum: i butiken eller ett annat specialrum (aldrig i valv, hemliga rum eller vaktarens sal)
    for (const ch of npcLeft) for (const r of rng.shuffle(rooms.filter(r => r.type === 'shop' || (r.type === 'special' && r.special !== 'challenge' && r.special !== 'camp')))) if (npc(r, ch)) break;
    // husdjursbur (~15 %): i ett hörn av ett stridsrum
    if (rng.chance(0.15)) for (const r of rng.shuffle(rooms.filter(isCombat))) if (place(r, '©', 1, { corner: true }).length || place(r, '©', 1, { wall: true }).length) break;
    // två (elit: tre) rutor långt från P reserveras för fiendegruppen i varje stridsrum
    for (const r of rooms.filter(isCombat)) {
      const c = cands(r, { far: true }), got = [];
      for (const sp of [2, 1]) for (const [x, y] of c) { if (got.length >= (r.type === 'elite' ? 3 : 2)) break; if (!resv[y * W + x] && !got.some(p => cheb(p[0], p[1], x, y) < sp)) { resv[y * W + x] = 1; got.push([x, y]); } }
    }
    // specialrummen och valven måste ha fått sitt innehåll
    const SP_CH = { fortune: ')', challenge: '?', offering: ';', smithy: '(', alchemy: '£', chapel2: '€', camp: '¶' };
    for (const r of rooms) {
      if (r.type === 'special' && !r.cells.some(([x, y]) => g[y][x] === SP_CH[r.special])) return null;
      if (r.type === 'vault' && !r.cells.some(([x, y]) => 'CAha$,'.includes(g[y][x]))) return null;
    }
    // altaret hamnar i ett kapell; finns inget får ett annat stort rum det
    if (L.altar && !cnt.y) {
      for (const r of rooms.filter(isCombat).sort((a, b) => size(b) - size(a))) {
        const p = place(r, 'y', 1, { wall: true, center: true, jit: 2 })[0];
        if (p) { place(r, 'c', F.int(1, 2), { near: [p[0], p[1], 2] }); break; }
      }
    }

    // ----- vapen: ett rum mitt i banan -----
    if (opts.weapon && WEAPON_CHARS.includes(opts.weapon)) {
      const ds = rooms.map(a => a.d).sort((a, b) => a - b), med = ds[ds.length >> 1];
      let pool = normal(); if (!pool.length) pool = rooms.filter(a => isCombat(a) || a.type === 'treasure');
      pool.sort((a, b) => Math.abs(a.d - med) - Math.abs(b.d - med));
      let done = false;
      for (const a of pool) if (place(a, opts.weapon, 1, {}).length) { done = true; break; }
      if (!done) return null;
    }
    // ----- eldfat som ljuskällor, intill väggar -----
    {
      const bc = cfg.barrels || { p: 0.5, min: 2 }, placed = [];
      const ok = (x, y) => cheb(x, y, P[0], P[1]) >= 2 && cheb(x, y, X[0], X[1]) >= 2 && placed.every(p => cheb(p[0], p[1], x, y) >= 4);
      const lit = rooms.filter(a => a.type !== 'guardian' && a.type !== 'secret' && a.type !== 'vault');
      for (const a of rng.shuffle(lit.slice())) {
        const want = (rng.chance(bc.p) ? 1 : 0) + (bc.tags && bc.tags.includes(a.tag) ? 1 : 0);
        for (let k = 0; k < want; k++) { const c = place(a, 'f', 1, { wall: true, pred: ok })[0]; if (c) placed.push(c); }
      }
      for (const a of rng.shuffle(lit.slice())) { if (placed.length >= bc.min) break; const c = place(a, 'f', 1, { wall: true, pred: ok })[0]; if (c) placed.push(c); }
      if (!placed.length) return null;
    }
    // ----- hälsa, ammo, rustning, guld, krukor -----
    const lootRooms = rooms.filter(a => a.type !== 'shop' && a.type !== 'guardian' && a.type !== 'secret' && a.type !== 'vault');
    const scatter = (count, ch, list) => {
      for (let i = 0; i < count; i++) for (let t = 0; t < 8; t++) { const a = rng.weighted(list, size); if (a && place(a, ch, 1, {}).length) break; }
    };
    const start = rooms.find(r => r.type === 'start');
    if (rng.chance(0.4)) place(start, rng.chance(0.5) ? 'h' : 'a', 1, { pred: (x, y) => cheb(x, y, P[0], P[1]) >= 2 });
    scatter(rng.int(3, 5), 'h', lootRooms.filter(a => a.type !== 'start'));
    scatter(rng.int(3, 5), 'a', lootRooms.filter(a => a.type !== 'start'));
    if (rng.chance(Math.min(0.75, 0.3 + 0.08 * depth))) scatter(1, 'A', lootRooms.filter(a => isCombat(a) || a.type === 'treasure'));
    const gold = rng.int(3, 8), secretGold = L.secret ? Math.min(2, gold - 2) : 0;
    scatter(gold - secretGold, '$', lootRooms);
    for (let i = rng.int(2, 5); i > 0; i--) for (let t = 0; t < 8; t++) { const a = rng.weighted(lootRooms, size); if (a && place(a, 'o', 1, { pred: (x, y) => nWall(x, y) > 0 || rng.chance(0.25) }).length) break; }
    // granatknippen (1-3, fler i förråd och vapenkammare) och ibland en skattkarta
    scatter(rng.int(1, 3), ',', lootRooms.filter(a => a.type !== 'start'));
    for (const a of rooms) if ((a.arch === 'storeroom' || a.arch === 'armory') && rng.chance(0.6)) place(a, ',', 1, { wall: true });
    if (!cnt[','] && !lootRooms.some(a => place(a, ',', 1, {}).length)) return null;
    if (rng.chance(0.3)) rng.shuffle(rooms.filter(a => isCombat(a) || a.type === 'treasure')).some(a => place(a, "'", 1, { far: true }).length);
    // drycker (högst 2 totalt; alkemistens rum och valven har redan fått sina)
    if (rng.chance(0.4)) scatter(1, '¥', lootRooms.filter(a => a.type !== 'start'));
    // hemligt rum: en kandelaber/benhög i hörnet längst från ingången, sedan belöningarna
    if (L.secret) {
      const s = L.secret, d = s.door;
      const far = s.cells.filter(([x, y]) => (x !== s.cx || y !== s.cy) && g[y][x] === '.').sort((a, b) => cheb(b[0], b[1], d[0], d[1]) - cheb(a[0], a[1], d[0], d[1]) + (rng.next() - 0.5) * 0.5)[0];
      if (far) set(far[0], far[1], rng.chance(0.5) ? 'c' : 'j');
      fillSecret(rng, g, s, s.cells.slice(), secretGold);
    }

    // ----- fiender: grupper om 2-5 per stridsrum (elitrummen har E i gruppen), aldrig en ensam fiende -----
    const eTypes = enemyTypes(depth, L.biome);
    const pickEnemy = mix => rng.weighted(eTypes, t => t[1] * (mix && mix.includes(t[0]) ? 3 : 1))[0];
    const fight = rooms.filter(isCombat);
    const want = new Map(fight.map(r => [r, 2]));
    const typeF = { normal: 1, exit: 1.3, elite: 1.4 };
    let left = 6 + 3 * depth + rng.int(-1, 2) - 2 * fight.length;
    for (const [div, top] of [[7, 5], [4, 5]]) { // först normala grupper, sedan tätare om rummen är få (högst 5 per grupp)
      for (; left > 0; left--) {
        const r = rng.weighted(fight, q => (want.get(q) < Math.min(top, Math.max(2, Math.floor(q.far / div))) ? Math.sqrt(size(q)) * typeF[q.type] : 0));
        if (!r) break;
        want.set(r, want.get(r) + 1);
      }
    }
    if (left > 3) return null; // för få/små stridsrum för våningens fiender: bygg om (högst 3 under budget, utom eliterna)
    for (const r of fight) {
      const c = cands(r, { far: true, enemy: true });
      if (c.length < 2) return null;
      const c0 = c[0], A = ARCH[r.arch], mix = A.mix, placed = [], nForce = r.type === 'elite' ? 3 : 2;
      const order = c.map(p => [p[0], p[1], Math.hypot(p[0] - c0[0], p[1] - c0[1]) + rng.next() * 1.5]).sort((a, b) => a[2] - b[2]);
      for (const sp of [2, 1]) for (const [x, y] of order) {
        if (placed.length >= want.get(r)) break;
        if (g[y][x] !== '.' || placed.some(p => cheb(p[0], p[1], x, y) < sp)) continue;
        set(x, y, r.type === 'elite' && !placed.length ? 'E' : A.force && placed.length < nForce ? A.force : pickEnemy(mix)); placed.push([x, y]);
      }
      if (placed.length < 2) return null;
      r.group = c0; r.en = placed.length;
    }
    // ----- levande rustningar: några rustningsställ i fängelsehålans stridsrum vaknar (räknas som fiender) -----
    if (L.biome === 'dungeon' && depth >= 2) {
      let n = rng.int(0, 2);
      for (const r of rng.shuffle(fight.slice())) for (const [x, y] of r.cells) if (n > 0 && g[y][x] === 'H' && farFromP(x, y) && rng.chance(0.4)) { g[y][x] = '+'; n--; }
    }
    // ----- gargoyler: ibland är en staty i ett stridsrum en vilande gargoyle (räknas som fiende) -----
    if ((L.biome === 'dungeon' || L.biome === 'courtyard' || L.biome === 'graveyard') && depth >= 2) {
      let n = rng.chance(0.45) ? 1 : 0;
      for (const r of rng.shuffle(fight.slice())) for (const [x, y] of r.cells) if (n > 0 && g[y][x] === 'u' && farFromP(x, y) && rng.chance(0.5)) { g[y][x] = 'Ö'; n--; }
    }
    // ----- explosiva tunnor nära fiendegrupperna (1-4) -----
    for (let k = rng.int(1, 4); k > 0; k--) {
      const r = rng.weighted(fight, q => (q.en >= 3 ? 2 : 1));
      if (!r || !(place(r, 'e', 1, { near: [r.group[0], r.group[1], 3.5] }).length || place(r, 'e', 1, {}).length)) break;
    }
    if (!cnt.e) for (const r of rng.shuffle(rooms.filter(q => q.type !== 'guardian' && q.type !== 'start' && q.type !== 'vault'))) if (place(r, 'e', 1, {}).length) break;
    if (!cnt.e) return null;
    // ----- spikfällor: i korridorer (fängelsehålan) och stridsrum, aldrig vid dörrar, P eller x -----
    {
      const goal = Math.min(CAP.z, Math.max(cnt.z || 0, L.spikes || 0)), cor = L.corridors ? rng.shuffle(L.corridors.slice()) : [];
      let inCor = 0;
      for (const [x, y] of cor) {
        if ((cnt.z || 0) >= goal || inCor >= 2) break;
        if (g[y][x] === '.' && !lock[y * W + x] && !nearCh(x, y, 'z', 3) && localOK(G, x, y)) { set(x, y, 'z'); inCor++; }
      }
      for (const r of rng.shuffle(fight.slice())) { if ((cnt.z || 0) >= goal) break; place(r, 'z', 1, { strict: true, avoid: ['z', 2] }); }
    }
    // ----- mimics: ~15 % av de extra kistorna (den garanterade kortkistan är alltid äkta) -----
    for (const [x, y] of extraChests) if (g[y][x] === 'C' && farFromP(x, y) && rng.chance(0.15)) g[y][x] = 'Q';

    // ----- fällor och farliga golv: rumstypernas egna, pilplattor i korridorer, gasventiler i grottor/träsk, väv i hörn -----
    {
      let k = rng.chance(0.5) ? 1 : 0;
      for (const [x, y] of L.corridors ? rng.shuffle(L.corridors.slice()) : []) { if (k <= 0) break; if (trapOK(x, y) && wallInLine(x, y) && can('<')) { set(x, y, '<'); k--; } }
      for (const r of rooms) if (ARCH[r.arch].hazard) ARCH[r.arch].hazard(r, Z);
      if (rng.chance(0.3)) Z.traps(rng.pick(fight), '<', rng.int(1, 2));
      if ((L.biome === 'caves' || L.biome === 'swamp') && rng.chance(0.3)) Z.traps(rng.pick(fight), '>', 1);
      for (const r of rooms) if ((isCombat(r) || r.type === 'treasure') && r.arch !== 'nest' && rng.chance(0.12)) {
        let n = rng.int(1, 2);
        for (const [x, y] of rng.shuffle(hzFree(r))) { if (n <= 0) break; if (nWall(x, y) >= 2) { set(x, y, '"'); n--; } }
      }
      // frostfästet: isfläckar i stridsrummen och istappar (Ç) vid kanterna; frusna rum i andra biomer får ibland några istappar
      if (L.biome === 'frost') {
        for (const r of rooms) if (isCombat(r) && !ARCH[r.arch].hazard && rng.chance(0.3)) Z.blob(r, ':', Z.range(0.08, 0.18));
        let n = rng.int(3, 8);
        for (const r of rng.shuffle(rooms.filter(r => isCombat(r) || r.type === 'treasure')).sort((a, b) => (b.indoor ? 1 : 0) - (a.indoor ? 1 : 0))) if (n > 0) n -= Z.icicles(r, Math.min(n, rng.int(1, 3)));
      } else for (const r of rooms) if (r.arch === 'frozen' && rng.chance(0.5)) Z.icicles(r, rng.int(1, 2));
      // vulkanen: ibland en liten lavagöl i stridsrummen, och en lavaflod (med broar) över askfälten som blev specialrum
      if (L.biome === 'volcano') {
        for (const r of rooms) if (isCombat(r) && !ARCH[r.arch].hazard && rng.chance(0.3)) Z.pool(r, '_', Z.range(1, 1.6));
        for (const r of rooms) if (r.tag === 'yard' && r.type !== 'start' && !ARCH[r.arch].hazard && rng.chance(0.75)) Z.river(r, '_');
        // minst 10 + 2 * djup lavarutor: fler floder/gölar, stridsrummen först (där lavamaskarna ska stå), startrummet sist
        const goal = 10 + 2 * depth, pri = r => (isCombat(r) ? 0 : r.tag === 'yard' ? 1 : r.type === 'start' ? 3 : 2);
        const more = rng.shuffle(rooms.filter(r => !['guardian', 'secret', 'vault', 'special', 'shop'].includes(r.type))).sort((a, b) => pri(a) - pri(b));
        for (let pass = 0; pass < 2; pass++) for (const r of more) {
          if ((cnt._ || 0) >= goal) break;
          if (r.box.w >= 6 && r.box.h >= 6 && rng.chance(0.5)) Z.river(r, '_');
          if ((cnt._ || 0) < goal) Z.pool(r, '_', Z.range(1.4, 2.2));
        }
      }
      // sjunkna staden (version 8): minst 18 + 3 * djup rutor djupt vatten: fler bassänger och gölar, torgen och stridsrummen först
      if (L.biome === 'sunken') {
        const goal = 18 + 3 * depth, pri = r => (r.tag === 'yard' ? 0 : isCombat(r) ? 1 : r.type === 'start' ? 3 : 2);
        const more = rng.shuffle(rooms.filter(r => !['guardian', 'secret', 'vault', 'special', 'shop'].includes(r.type))).sort((a, b) => pri(a) - pri(b));
        for (let pass = 0; pass < 2; pass++) for (const r of more) {
          if ((cnt['Đ'] || 0) >= goal) break;
          if (r.box.w >= 7 && r.box.h >= 7 && !r.cells.some(([x, y]) => g[y][x] === 'Đ') && rng.chance(0.5)) Z.lake(r, 'Đ');
          else Z.pool(r, 'Đ', Z.range(1.5, 2.4));
        }
      }
    }
    // ----- sprucken vägg i stället för hemlig vägg (40 %): räknas som vägg tills den sprängs -----
    if (L.secret && rng.chance(0.4)) { const [dx, dy] = L.secret.door; if (g[dy][dx] === '*') g[dy][dx] = '{'; }
    // ----- rekvisita i alla rum utom start (säkerhetsnät om rumstypen inte fick plats med något) -----
    for (const r of rooms) {
      if (r.type === 'start' || r.cells.some(([x, y]) => PROP_CHARS.includes(g[y][x]))) continue;
      if (!place(r, rng.chance(0.5) ? 'c' : 'j', 1, {}).length && !place(r, 'j', 1, { strict: false }).length) {
        const c = r.cells.find(([x, y]) => g[y][x] === '.');
        if (!c) return null;
        set(c[0], c[1], 'j');
      }
    }
    // ----- version 6: nya fiender, rekvisita, föremål och fällor (körs sist, med egna slumpflöden) -----
    if (!content6(G, depth, opts, L, { rng: v6, rooms, fight, P, X, cnt, set, place, npc, trapOK, nearCh, nWall, farFromP, nearPX, rid })) return null;
    // ----- version 7: nya fiender, sarkofager, NPC:er, föremål, kvicksand, rullsten, ljusschakt, hieroglyfer (eget slumpflöde) -----
    G.boulders = []; G.beams = [];
    if (!(opts.v7off) && !content7(G, depth, opts, L, { rng: rng.fork('v7'), rooms, fight, P, X, cnt, can, set, place, npc, trapOK, nearCh, nWall, farFromP, nearPX, rid, size, isCombat })) return null;
    // ----- version 8: kristallgrottornas och sjunkna stadens egna saker, nya fiender, NPC:er och föremål i alla biomer (gaffeln 'v8') -----
    if (!content8(G, depth, opts, L, { rng: rng.fork('v8'), rooms, fight, P, X, cnt, can, set, place, trapOK, nearCh, nWall, farFromP, nearPX, rid, size, isCombat, floorIdx })) return null;
    // ----- version 9: klocktornets och molnborgens egna saker, kugghjul och fjädrar i alla biomer (gaffeln 'v9') -----
    if (!content9(G, depth, opts, L, { rng: rng.fork('v9'), rooms, fight, P, X, cnt, can, set, place, trapOK, nearCh, nWall, farFromP, nearPX, rid, size, isCombat, floorIdx })) return null;
    // ----- version 10: nya fiender i de gamla biomerna och legendaltaret (gaffeln 'v10', med ångra-lista) -----
    content10(G, depth, opts, L, { rng: rng.fork('v10'), rooms, fight, cnt, place, rid, size });
    // ----- version 11: svamprikets och spegelpalatsets egna saker, sporsäckar i alla biomer (gaffeln 'v11', körs sist av allt) -----
    if (!content11(G, depth, opts, L, { rng: rng.fork('v11'), rooms, fight, P, X, cnt, set, place, trapOK, nearPX, rid, size, isCombat, floorIdx })) return null;
    // ----- version 13: bibliotekets och gjuteriets egna saker, bläckflaskor i alla biomer (gaffeln 'v13', körs sist av allt) -----
    if (!content13(G, depth, opts, L, { rng: rng.fork('v13'), rooms, fight, P, X, cnt, set, place, trapOK, nearPX, rid, size, isCombat, corridors: L.corridors })) return null;
    // ----- version 14: nya rumstyper, nya fiender i de mellersta och sena biomerna, arenarum (gaffeln 'v14', med ångra-lista, körs sist av allt) -----
    G.arenas = [];
    if (!opts.v14off) content14(G, depth, opts, L, { rng: rng.fork('v14'), rooms, fight, P, X, cnt, rid });
    // ----- version 15: katedralens och bikupans egna saker, bikupor och några korgossar/keruber/arbetsbin i andra biomer (gaffeln 'v15', ångra-lista) -----
    const H15 = { rooms, fight, P, X, cnt, set, place, trapOK, rid, isCombat, corridors: L.corridors, floorIdx, resv };
    if (!opts.v15off || ['cathedral', 'hive'].includes(L.biome)) if (!content15(G, depth, opts, L, Object.assign({ rng: rng.fork('v15') }, H15))) return null;
    // ----- version 16: trädgårdens och drömrikets egna saker, drömflaskor och några taggrankor/drömätare/sömngångare i andra biomer (gaffeln 'v16') -----
    if ((!opts.v16off && !opts.v15off) || ['garden', 'dream'].includes(L.biome)) if (!content16(G, depth, opts, L, Object.assign({ rng: rng.fork('v16') }, H15))) return null;

    // ----- utdata: rumslista och rumsmask -----
    const out = rooms.map(r => {
      const b = r.outBox || r.box, o = { x: b.x, y: b.y, w: b.w, h: b.h, type: r.type, arch: r.arch };
      if (r.tag && r.tag !== 'room') o.tag = r.tag;
      if (r.shape) o.shape = r.shape;
      if (r.type === 'guardian') o.guardian = L.gid;
      if (r.lock) o.lock = r.lock;
      return o;
    });
    const mask = new Array(W * G.H);
    for (let i = 0; i < mask.length; i++) mask[i] = rid[i] < 0 ? '-' : String.fromCharCode(48 + rid[i]);
    return { rooms: out, roomMask: rowsOf(W, G.H, mask), floors: L.floors };
  }

  // ---------- Version 6: nya fiender, rekvisita, föremål och fällor ----------
  // Körs sist i content med egna slumpflöden (forks av content-slumpens 'v6'), så att allt som fanns i version 5 ligger kvar
  // på samma ställen och de nya sakerna läggs ovanpå. H: hjälpfunktionerna från content.
  const FOE_FROM = 'SKVILNORWUXY!@^ÅÄÉÜ'; // fiender som kan bytas mot en ny sort (inte E, Q, Z eller vilande statyer/rustningar)
  function content6(G, depth, opts, L, H) {
    const { W, g, lock, fm } = G, { rooms, fight, P, set, place, trapOK, nearCh, nWall, farFromP, nearPX, rid } = H, b = L.biome;
    const fk = tag => H.rng.fork(tag), cor = L.corridors || [];
    const lavaAdj = (x, y) => [0, 1, 2, 3].some(d => g[y + DY[d]][x + DX[d]] === '_');
    const doorAdj = (x, y) => [0, 1, 2, 3].some(d => isDoorCh(g[y + DY[d]][x + DX[d]]));
    // nya fiender: byts in mot redan utplacerade fiender i stridsrummen (gruppernas storlek ändras inte)
    {
      const R = fk('foes'), pool = [], want = [];
      for (const r of fight) if (r.arch !== 'nest') for (const [x, y] of r.cells) if (FOE_FROM.includes(g[y][x])) pool.push([x, y]);
      R.shuffle(pool);
      if (depth >= 3) { if (R.chance(0.4)) want.push('Ñ'); if (R.chance(0.12)) want.push('Ñ'); } // nekromantiker: alla biomer, sällsynt
      if (depth >= 3 && ['dungeon', 'graveyard', 'courtyard', 'volcano'].includes(b)) { if (R.chance(b === 'volcano' ? 0.6 : 0.45)) want.push('Ð'); if (R.chance(0.18)) want.push('Ð'); }
      if (depth >= 2 && ['graveyard', 'swamp', 'frost'].includes(b) && R.chance(0.65)) for (let k = R.int(1, 3); k > 0; k--) want.push('Ý');
      if (depth >= 2 && (b === 'caves' || b === 'dungeon') && R.chance(0.25)) for (let k = R.int(1, 2); k > 0; k--) want.push('Æ');
      for (const ch of want) { const p = pool.pop(); if (!p) break; g[p[1]][p[0]] = ch; }
    }
    // lavamaskar (vulkanen): fiender som står vid lavan blir maskar, annars flyttas en fiende i samma rum till lavakanten
    if (b === 'volcano') {
      const R = fk('worms'), mob = FOE_FROM + 'Æ';
      let n = R.int(1, 3);
      for (const r of R.shuffle(fight.slice())) for (const [x, y] of r.cells) if (n > 0 && mob.includes(g[y][x]) && lavaAdj(x, y) && R.chance(0.7)) { g[y][x] = 'Þ'; n--; }
      for (const r of R.shuffle(fight.slice())) {
        if (n <= 0) break;
        // (fria rutor nära öppningar duger, men aldrig direkt i en dörrpassage eller framför köpmannen)
        const spots = r.cells.filter(([x, y]) => g[y][x] === '.' && farFromP(x, y) && lavaAdj(x, y) && !doorAdj(x, y) && !nearCh(x, y, 'M', 1));
        const movers = r.cells.filter(([x, y]) => mob.includes(g[y][x]));
        if (!spots.length || !movers.length) continue;
        const s = R.pick(spots), m = R.pick(movers);
        g[m[1]][m[0]] = '.'; g[s[1]][s[0]] = 'Þ'; n--;
      }
      // ingen mask alls (lavan hamnade utanför stridsrummen): en egen liten lavaruta i ett stridsrum med masken bredvid
      if (!fight.some(r => r.cells.some(([x, y]) => g[y][x] === 'Þ'))) {
        let done = false;
        for (const r of R.shuffle(fight.slice())) {
          const movers = r.cells.filter(([x, y]) => mob.includes(g[y][x]));
          if (!movers.length) continue;
          for (const [x, y] of R.shuffle(r.cells.slice())) {
            if (g[y][x] !== '.' || lock[y * W + x] || nearPX(x, y) || doorAdj(x, y) || !localOK(G, x, y)) continue;
            const sp = [0, 1, 2, 3].map(d => [x + DX[d], y + DY[d]]).find(([sx, sy]) => rid[sy * W + sx] === r.id && g[sy][sx] === '.' && farFromP(sx, sy) && !doorAdj(sx, sy) && !nearCh(sx, sy, 'M', 1));
            if (!sp) continue;
            const m = R.pick(movers);
            g[y][x] = '_'; g[m[1]][m[0]] = '.'; g[sp[1]][sp[0]] = 'Þ'; done = true; break;
          }
          if (done) break;
        }
      }
    }
    // gift- och frosttunnor (0-3) nära fiendegrupperna: fler µ i vulkanen och träsket, fler ß i frostfästet
    {
      const R = fk('barrels'), list = [];
      if (b === 'volcano' || b === 'swamp') for (let k = R.int(1, 2); k > 0; k--) list.push('µ');
      if (b === 'frost') for (let k = R.int(1, 2); k > 0; k--) list.push('ß');
      if (R.chance(0.35)) list.push(b === 'frost' ? (R.chance(0.7) ? 'ß' : 'µ') : R.chance(0.6) ? 'µ' : 'ß');
      for (const ch of list.slice(0, 3)) {
        const r = R.weighted(fight, q => (q.en >= 3 ? 2 : 1));
        if (r && !place(r, ch, 1, { near: [r.group[0], r.group[1], 4], rng: R }).length) place(r, ch, 1, { rng: R });
      }
    }
    // anslagstavla (~30 %): i startrummet eller ett rum som gränsar till det (bara korridorer/dörrar emellan)
    {
      const R = fk('board');
      if (R.chance(0.3)) {
        const start = rooms.find(r => r.type === 'start'), seen = new Uint8Array(W * G.H), st = [], adj = new Set();
        for (const [x, y] of start.cells) { seen[y * W + x] = 1; st.push(y * W + x); }
        while (st.length) {
          const c = st.pop();
          for (let d = 0; d < 4; d++) {
            const ni = c + DX[d] + DY[d] * W;
            if (seen[ni] || isWall(g[(ni / W) | 0][ni % W])) continue;
            seen[ni] = 1;
            if (rid[ni] < 0) st.push(ni); else if (rid[ni] !== start.id) adj.add(rooms[rid[ni]]);
          }
        }
        const near = [...adj].filter(q => ['normal', 'elite', 'exit', 'treasure', 'shop', 'shrine', 'special'].includes(q.type));
        for (const r of [start].concat(R.shuffle(near))) if (H.npc(r, '®', R)) break;
      }
    }
    // runsten (~35 %): helst i ett valv, skattrum eller hemligt rum
    {
      const R = fk('rune');
      if (R.chance(0.35)) {
        const c = rooms.filter(q => q.type !== 'start' && q.type !== 'guardian' && q.type !== 'shop');
        for (let t = 0; t < 6; t++) {
          const r = R.weighted(c, q => (q.type === 'vault' ? 5 : q.type === 'treasure' ? 4 : q.type === 'secret' ? 3 : 1));
          if (r && place(r, 'ª', 1, { rng: R }).length) break;
        }
      }
    }
    // kött: lägret har redan fått sitt; ibland ett i kasernen eller smedjehallen
    { const R = fk('meat'); for (const r of rooms) if ((r.arch === 'barracks' || r.arch === 'forge') && R.chance(0.3)) place(r, 'ð', 1, { rng: R }); }
    // eldstrålar (vulkanen och fängelsehålan): i korridorer och längs stridsrummens väggar, aldrig vid dörrar, P eller x
    if (b === 'dungeon' || b === 'volcano') {
      const R = fk('jets');
      let n = b === 'volcano' ? R.int(2, 4) : R.chance(0.35) ? R.int(1, 3) : 0;
      if (n) {
        const c = cor.slice();
        for (const r of fight) for (const [x, y] of r.cells) if (nWall(x, y) >= 1) c.push([x, y]);
        for (const [x, y] of R.shuffle(c)) { if (n <= 0) break; if (trapOK(x, y) && !nearCh(x, y, '°', 2)) { set(x, y, '°'); n--; } }
      }
    }
    // pendelblad: bara i korridorer som är en ruta breda (väggar på båda sidor)
    if (cor.length && (b === 'dungeon' || b === 'volcano' || b === 'frost')) {
      const R = fk('pendulum');
      let n = R.chance(b === 'frost' ? 0.2 : b === 'volcano' ? 0.35 : 0.3) ? R.int(1, b === 'frost' ? 1 : b === 'volcano' ? 3 : 2) : 0;
      const narrow = (x, y) => (isWall(g[y - 1][x]) && isWall(g[y + 1][x]) && !isBlock(g[y][x - 1]) && !isBlock(g[y][x + 1]))
        || (isWall(g[y][x - 1]) && isWall(g[y][x + 1]) && !isBlock(g[y - 1][x]) && !isBlock(g[y + 1][x]));
      for (const [x, y] of R.shuffle(cor.slice())) { if (n <= 0) break; if (rid[y * W + x] < 0 && trapOK(x, y) && narrow(x, y) && !nearCh(x, y, '±', 3)) { set(x, y, '±'); n--; } }
    }
    // tryckplatta (~50 % av banorna med ett hemligt rum): i rummet framför den hemliga/spruckna väggen, 2-6 rutor från den
    if (L.secret) {
      const R = fk('plate'), [dx, dy] = L.secret.door;
      if (R.chance(0.5)) {
        let host = null;
        for (let d = 0; d < 4; d++) { const i = (dy + DY[d]) * W + dx + DX[d]; if (rid[i] >= 0 && rid[i] !== L.secret.id) host = rooms[rid[i]]; }
        if (host && host.type !== 'guardian' && host.type !== 'vault' && host.type !== 'secret') {
          const c = host.cells.filter(([x, y]) => trapOK(x, y) && cheb(x, y, dx, dy) >= 2 && cheb(x, y, dx, dy) <= 6);
          if (c.length) { const p = R.pick(c); set(p[0], p[1], '¨'); }
        }
      }
    }
    // hemlig trappa (~35 % av de hemliga rummen): inne i det hemliga rummet, inte vid ingången, stänger inte av något
    if (L.secret) {
      const R = fk('stairs'), s = L.secret, [dx, dy] = s.door;
      if (R.chance(0.35)) {
        const c = R.shuffle(s.cells.filter(([x, y]) => g[y][x] === '.' && cheb(x, y, dx, dy) >= 2 && localOK(G, x, y)));
        if (c.length) set(c[0][0], c[0][1], '÷');
      }
    }
    // smulande golv: i korridorer, på broar/spänger och i trånga passager, men bara där det finns en annan väg
    // (med ¬ som vägg nås fortfarande allt som nåddes förut, med grindarna stängda och öppna, utan lava och spikar)
    {
      const R = fk('crumble');
      const want = b === 'volcano' ? R.int(3, 8) : b === 'dungeon' ? (R.chance(0.4) ? R.int(1, 4) : 0)
        : b === 'frost' || b === 'caves' || b === 'swamp' ? (R.chance(0.3) ? R.int(1, 3) : 0) : R.chance(0.15) ? R.int(1, 2) : 0;
      if (want) {
        const N = W * G.H, st = new Int32Array(N);
        let bO = new Uint8Array(N), bS = new Uint8Array(N), tO = new Uint8Array(N), tS = new Uint8Array(N);
        const flood = (open, seen) => {
          seen.fill(0); let sp = 0, n = 1; const s0 = P[1] * W + P[0];
          seen[s0] = 1; st[sp++] = s0;
          while (sp) {
            const c = st[--sp];
            for (let d = 0; d < 4; d++) {
              const ni = c + DX[d] + DY[d] * W, ch = g[(ni / W) | 0][ni % W];
              if (seen[ni] || ch === '_' || ch === 'z' || ch === '¬' || isWet(ch) || (isBlock(ch) && !(open && GATES.includes(ch)))) continue; // (version 8: vatten och spikar räknas som lava)
              seen[ni] = 1; st[sp++] = ni; n++;
            }
          }
          return n;
        };
        const plank = b === 'swamp' ? L.floors.indexOf('floor_wood_planks') : -1;
        const narrow = (x, y) => [0, 1, 2, 3].reduce((n, d) => n + (genBlk(g[y + DY[d]][x + DX[d]]) ? 1 : 0), 0) >= 2;
        const c = cor.slice();
        for (const r of rooms) if (r.type !== 'guardian') for (const [x, y] of r.cells) if (lavaAdj(x, y) || (plank >= 0 && fm[y * W + x] === plank) || narrow(x, y)) c.push([x, y]);
        let nO = flood(true, bO), nS = flood(false, bS), n = 0, tries = 0;
        for (const [x, y] of R.shuffle(c)) {
          const i = y * W + x;
          if (n >= want || tries >= 40) break;
          if (g[y][x] !== '.' || !bO[i] || lock[i] > 1 || nearPX(x, y) || doorAdj(x, y) || nearCh(x, y, '¬', 1)) continue;
          tries++;
          g[y][x] = '¬';
          // att lägga till ett hinder kan bara ta bort rutor, så samma antal (minus rutan själv) betyder samma mängd
          const mO = flood(true, tO), mS = flood(false, tS);
          if (mO === nO - 1 && mS === nS - (bS[i] ? 1 : 0)) {
            [bO, tO] = [tO, bO]; [bS, tS] = [tS, bS]; nO = mO; nS = mS; n++;
          } else g[y][x] = '.';
        }
      }
    }
    // vulkanen: broar över lavan på askfälten får basaltgolv
    if (b === 'volcano') for (const r of rooms) if (r.tag === 'yard') for (const [x, y] of r.cells) {
      const c = g[y][x];
      if (c === '_' || isWall(c)) continue;
      if ((g[y - 1][x] === '_' && g[y + 1][x] === '_') || (g[y][x - 1] === '_' && g[y][x + 1] === '_')) fm[y * W + x] = 0;
    }
    return true;
  }

  // ---------- Version 7: nya fiender, sarkofager, larmklocka, NPC:er, föremål, kvicksand, rullsten, ljusschakt, hieroglyfer ----------
  // Körs allra sist i content med egna slumpflöden (forks av content-slumpens 'v7'): allt från version 6 ligger kvar och de nya
  // sakerna läggs ovanpå. Utom i gravkammaren misslyckas den aldrig (allt är frivilligt); underkänns banan ändå byggs samma försök
  // om utan version 7 (se build7). Lägger rullstenarna i G.boulders och ljusschakten i G.beams.
  const QUICKSAND_CAP = 32;
  function content7(G, depth, opts, L, H) {
    const { W, g, lock } = G, { rooms, fight, P, cnt, set, place, trapOK, nearCh, nWall, nearPX, rid, size } = H, b = L.biome;
    const fk = tag => H.rng.fork(tag), cor = L.corridors || [], N = W * G.H, tomb = b === 'tomb';
    if (opts.v7) { opts.v7.added = true; if (tomb) opts.v7.tomb = true; }
    const doorAdj = (x, y) => [0, 1, 2, 3].some(d => isDoorCh(g[y + DY[d]][x + DX[d]]));
    // fri framsida: vägg bakom, fritt golv framför (larmklockan)
    const front = (x, y) => [0, 1, 2, 3].some(k => isWall(g[y + DY[k]][x + DX[k]]) && g[y - DY[k]][x - DX[k]] === '.' && lock[(y - DY[k]) * W + x - DX[k]] < 2);
    const enemyFree = r => r.type === 'shop' || r.type === 'shrine' || r.type === 'treasure' || (r.type === 'special' && r.special !== 'challenge');
    // ett nytt hinder får inte stänga in en kruka, spikfälla, lavaruta o.d. (localOK räknar dem som hinder): de behåller en fri granne
    const safe = (x, y) => [0, 1, 2, 3].every(d => {
      const nx = x + DX[d], ny = y + DY[d], c = g[ny][nx];
      if (!genBlk(c) || isBlock(c)) return true;
      return [0, 1, 2, 3].some(e => { const mx = nx + DX[e], my = ny + DY[e]; return (mx !== x || my !== y) && !genBlk(G.at(mx, my)); });
    });
    // NPC/rekvisita med fri framsida (som npc i content, men med safe)
    const npc7 = (r, ch, R, o) => place(r, ch, 1, Object.assign({ wall: true, center: true, jit: 2, pred: (x, y) => front(x, y) && safe(x, y), rng: R }, o))[0]
      || place(r, ch, 1, Object.assign({ center: true, pred: safe, rng: R }, o))[0] || null;
    // ----- sarkofager: gravkammaren 2-5 (gravkamrarna har redan fått sina), kyrkogårdens och fängelsehålans kryptor 0-2 -----
    {
      const R = fk('sarcophagi');
      if (tomb) {
        const want = R.int(2, 4), c = R.shuffle(rooms.filter(r => (H.isCombat(r) || r.type === 'treasure') && r.tag !== 'yard'))
          .sort((p, q) => (q.arch === 'burialchamber' ? 1 : 0) - (p.arch === 'burialchamber' ? 1 : 0));
        for (const r of c) { if ((cnt['²'] || 0) >= want) break; place(r, '²', 1, { wall: true, spread: 3, avoid: ['²', 2], pred: safe, rng: R }); }
        if ((cnt['²'] || 0) < 2) return false;
      } else if (b === 'graveyard' || b === 'dungeon') {
        for (const r of R.shuffle(rooms.filter(r => r.arch === 'crypt'))) if (R.chance(0.45)) place(r, '²', R.int(1, 2), { wall: true, spread: 3, avoid: ['²', 2], pred: safe, rng: R });
      }
    }
    // ----- nya fiender: byts in mot redan utplacerade fiender i stridsrummen (gruppernas storlek ändras inte) -----
    {
      const R = fk('foes'), mob = FOE_FROM + 'ÃÊ';
      const pool = r => r.cells.filter(([x, y]) => mob.includes(g[y][x]));
      const swap = (r, ch) => { const c = pool(r); if (!c.length) return false; const [x, y] = R.pick(c); g[y][x] = ch; cnt[ch] = (cnt[ch] || 0) + 1; return true; };
      const swapIn = (rs, ch, n) => { for (const r of rs) { if (n <= 0) break; if (swap(r, ch)) n--; } };
      // skarabéer: en hel grupp (3-5) i ett stridsrum (gravkammaren oftast, grottorna ibland); mumierna står kvar
      if (tomb || b === 'caves') {
        let groups = R.chance(tomb ? 0.75 : 0.35) ? (tomb && depth >= 3 && R.chance(0.3) ? 2 : 1) : 0;
        for (const r of R.shuffle(fight.filter(r => r.arch !== 'nest'))) {
          if (groups <= 0) break;
          const c = pool(r).filter(([x, y]) => g[y][x] !== 'Ã');
          if (c.length < 3) continue;
          for (const [x, y] of c.slice(0, 5)) g[y][x] = 'Õ';
          groups--;
        }
      }
      // mumier på kyrkogården (sällsynt; helst i ett rum med sarkofager eller likkistor), schakalkrigare på borggården (djup 2+)
      if (b === 'graveyard' && R.chance(0.3)) swapIn(R.shuffle(fight.slice()).sort((p, q) => (p.cells.some(([x, y]) => g[y][x] === '²' || g[y][x] === 'k') ? 0 : 1) - (q.cells.some(([x, y]) => g[y][x] === '²' || g[y][x] === 'k') ? 0 : 1)), 'Ã', R.int(1, 2));
      if (b === 'courtyard' && depth >= 2 && R.chance(0.45)) swapIn(R.shuffle(fight.slice()), 'Ê', R.int(1, 3));
      // tjuven (djup 2+, högst 1): helst i ett rum med guld; dubbelgångaren (djup 3+, högst 1)
      if (depth >= 2 && R.chance(0.22)) {
        const gold = r => r.cells.reduce((n, [x, y]) => n + (g[y][x] === '$' ? 1 : 0), 0);
        const r = R.weighted(fight.filter(r => pool(r).length), r => 0.3 + 2 * gold(r));
        if (r) swap(r, 'Î');
      }
      if (depth >= 3 && R.chance(0.22)) swapIn(R.shuffle(fight.slice()), 'Ô', 1);
    }
    // ----- larmklocka (~25 %, djup 2+): mot en vägg i ett stridsrum, med fritt golv framför (fienderna når den) -----
    {
      const R = fk('bell');
      if (depth >= 2 && R.chance(0.25)) for (const r of R.shuffle(fight.slice())) if (place(r, '³', 1, { wall: true, far: true, pred: (x, y) => front(x, y) && safe(x, y), rng: R }).length) break;
    }
    // ----- NPC:er: spelaren (~20 %) och bankiren (~15 %, aldrig på första våningen) i rum utan fiender, vandraren (~25 %) i ett rum
    // utan fiender eller en korridornisch (återvändsgränd) -----
    {
      const R = fk('npc');
      const quiet = R.shuffle(rooms.filter(enemyFree)).sort((p, q) => size(p) - size(q));
      if (R.chance(0.22)) for (const r of quiet) if (npc7(r, 'ç', R)) break;
      if (depth >= 2 && R.chance(0.16)) for (const r of rooms.filter(r => r.type === 'shop').concat(R.shuffle(rooms.filter(r => enemyFree(r) && r.type !== 'shop')), rooms.filter(r => r.type === 'start'))) if (npc7(r, 'ÿ', R)) break;
      if (R.chance(0.27)) {
        let done = false;
        if (cor.length && R.chance(0.5)) for (const [x, y] of R.shuffle(cor.slice())) {
          const i = y * W + x;
          if (rid[i] >= 0 || g[y][x] !== '.' || lock[i] || nWall(x, y) !== 3 || nearPX(x, y) || doorAdj(x, y) || !localOK(G, x, y) || !safe(x, y)) continue;
          set(x, y, 'ý'); done = true; break;
        }
        if (!done) for (const r of R.shuffle(rooms.filter(r => enemyFree(r) || r.type === 'start'))) if (npc7(r, 'ý', R)) break;
      }
    }
    // ----- föremål: krönikesida (~40 %, helst i hemliga rum, valv och skattrum), lampolja (0-2, fler djupt ner och i mörka biomer),
    // kaststenar (0-2 små högar) -----
    {
      const R = fk('items'), loot = rooms.filter(r => r.type !== 'guardian' && r.type !== 'shop');
      if (R.chance(0.4)) for (let t = 0; t < 6; t++) {
        const r = R.weighted(loot.filter(r => r.type !== 'start'), r => (r.type === 'secret' ? 6 : r.type === 'vault' || r.type === 'treasure' ? 3 : 1));
        if (r && place(r, 'þ', 1, { rng: R }).length) break;
      }
      const dark = b === 'caves' || b === 'dungeon' || tomb ? 0.15 : 0;
      const nB = R.chance(0.3 + 0.07 * depth + dark) ? (R.chance(0.15 + 0.06 * depth + dark) ? 2 : 1) : 0;
      for (let k = 0; k < nB; k++) for (let t = 0; t < 6; t++) { const r = R.weighted(loot.filter(r => r.type !== 'start'), size); if (r && place(r, '¼', 1, { rng: R }).length) break; }
      const nS = R.chance(0.5) ? (R.chance(0.35) ? 2 : 1) : 0;
      for (let k = 0; k < nS; k++) for (let t = 0; t < 6; t++) { const r = R.weighted(loot, size); if (r && place(r, '½', 1, { rng: R, avoid: ['½', 4] }).length) break; }
    }
    // ----- kvicksand (gravkammaren): fläckar om 2-8 rutor i sandgångarna, på gårdarna och i korridorerna, men bara där det finns en
    // annan väg (som det smulande golvet: med ¯ som vägg nås fortfarande allt som nåddes förut, grindarna stängda och öppna) -----
    if (tomb) {
      const R = fk('quicksand'), st = new Int32Array(N);
      let bO = new Uint8Array(N), bS = new Uint8Array(N), tO = new Uint8Array(N), tS = new Uint8Array(N);
      const flood = (open, seen) => {
        seen.fill(0); let sp = 0, n = 1; const s0 = P[1] * W + P[0];
        seen[s0] = 1; st[sp++] = s0;
        while (sp) {
          const c = st[--sp];
          for (let d = 0; d < 4; d++) {
            const ni = c + DX[d] + DY[d] * W, ch = g[(ni / W) | 0][ni % W];
            if (seen[ni] || ch === '_' || ch === 'z' || ch === '¬' || ch === '¯' || (isBlock(ch) && !(open && GATES.includes(ch)))) continue;
            seen[ni] = 1; st[sp++] = ni; n++;
          }
        }
        return n;
      };
      let nO = flood(true, bO), nS = flood(false, bS);
      const ok = (x, y) => g[y][x] === '.' && bO[y * W + x] && trapOK(x, y) && !nearCh(x, y, '¹', 1);
      const tryCell = (x, y) => {
        const i = y * W + x;
        g[y][x] = '¯';
        const mO = flood(true, tO), mS = flood(false, tS);
        if (mO === nO - 1 && mS === nS - (bS[i] ? 1 : 0)) { [bO, tO] = [tO, bO]; [bS, tS] = [tS, bS]; nO = mO; nS = mS; return true; }
        g[y][x] = '.'; return false;
      };
      // en fläck växer från en slumpad ruta inom området (inArea) tills den är size rutor; blir den bara en ruta tas den bort
      const patch = (cells, inArea, want) => {
        const seed = R.shuffle(cells.filter(([x, y]) => ok(x, y)))[0];
        if (!seed || (cnt['¯'] || 0) + 2 > QUICKSAND_CAP) return 0;
        const done = [], front = [seed], seen = new Set([seed[1] * W + seed[0]]);
        while (front.length && done.length < want && (cnt['¯'] || 0) < QUICKSAND_CAP) {
          const [x, y] = front.splice(R.int(0, front.length - 1), 1)[0];
          if (!ok(x, y) || !tryCell(x, y)) continue;
          cnt['¯'] = (cnt['¯'] || 0) + 1; done.push([x, y]);
          for (let d = 0; d < 4; d++) { const nx = x + DX[d], ny = y + DY[d], ni = ny * W + nx; if (!seen.has(ni) && inArea(nx, ny)) { seen.add(ni); front.push([nx, ny]); } }
        }
        if (done.length === 1) { const [x, y] = done[0]; g[y][x] = '.'; cnt['¯']--; nO = flood(true, bO); nS = flood(false, bS); return 0; }
        return done.length;
      };
      for (const r of R.shuffle(rooms.filter(r => r.arch === 'sandtunnel' || (r.tag === 'yard' && r.type !== 'start' && r.type !== 'guardian'))))
        for (let k = r.arch === 'sandtunnel' ? R.int(1, 2) : R.chance(0.7) ? 1 : 0; k > 0; k--) patch(r.cells, (x, y) => rid[y * W + x] === r.id, R.int(2, 8));
      if (cor.length) for (let k = R.chance(0.6) ? R.int(1, 2) : 0; k > 0; k--) patch(cor, (x, y) => rid[y * W + x] < 0, R.int(2, 4));
    }
    // ----- rullsten (gravkammaren ~50 %, fängelsehålan ~20 %): utlösaren ¹ i ena änden av en rak korridor (minst 6 rutor, fri från
    // hinder och dörrar); spelet rullar stenen från andra änden mot utlösaren. G.boulders = [{ tx, ty, sx, sy }] -----
    if ((tomb || b === 'dungeon') && cor.length) {
      const R = fk('boulder');
      if (R.chance(tomb ? 0.5 : 0.26)) { // (fängelsehålan: ~20 % av banorna får en, alla har inte en lång rak korridor)
        const inCor = new Uint8Array(N);
        for (const [x, y] of cor) if (rid[y * W + x] < 0) inCor[y * W + x] = 1;
        const clear = (x, y) => inCor[y * W + x] && !isBlock(g[y][x]) && !isDoorCh(g[y][x]) && !HAZARD.includes(g[y][x]);
        const runs = [];
        for (const hz of [true, false]) for (let a = 1; a < (hz ? G.H : W) - 1; a++) {
          let s0 = -1;
          for (let t = 1; t <= (hz ? W : G.H) - 1; t++) {
            const x = hz ? t : a, y = hz ? a : t, okC = t < (hz ? W : G.H) - 1 && clear(x, y);
            if (okC && s0 < 0) s0 = t;
            if (!okC && s0 >= 0) { if (t - s0 >= 6) runs.push({ hz, a, t0: s0, t1: t - 1 }); s0 = -1; }
          }
        }
        const cands = [];
        for (const r of runs) for (const end of [0, 1]) {
          const t = end ? r.t1 : r.t0, x = r.hz ? t : r.a, y = r.hz ? r.a : t;
          if (!trapOK(x, y) || nearCh(x, y, '¯', 1)) continue;
          const len = Math.min(14, r.t1 - r.t0 + 1), so = end ? t - len + 1 : t + len - 1;
          cands.push({ tx: x, ty: y, sx: r.hz ? so : x, sy: r.hz ? y : so });
        }
        if (cands.length) { const c = R.pick(cands); set(c.tx, c.ty, '¹'); G.boulders.push(c); }
      }
    }
    // ----- ljusschakt (gravkammaren oftast, borggården och fängelsehålan ibland): solljus genom ett hål i taket, 1-3 små fläckar om
    // 1-3 rutor i salar inomhus (högst 6 rutor). G.beams = [{ x, y }] -----
    {
      const R = fk('beams'), p = tomb ? 0.85 : b === 'courtyard' ? 0.25 : b === 'dungeon' ? 0.2 : 0;
      if (p && R.chance(p)) {
        const lit = (x, y) => G.inb(x, y) && !G.sky[y * W + x] && !isBlock(g[y][x]) && !G.beams.some(q => q.x === x && q.y === y);
        let left = R.int(tomb ? 3 : 1, tomb ? 6 : 3);
        for (const r of R.shuffle(rooms.filter(r => r.type !== 'secret' && r.type !== 'vault' && r.cells.length >= 9))) {
          if (left <= 0) break;
          const c = R.shuffle(r.cells.filter(([x, y]) => lit(x, y) && !nWall(x, y) && rid[y * W + x] === r.id))[0];
          if (!c) continue;
          G.beams.push({ x: c[0], y: c[1] }); left--;
          for (const d of R.shuffle([0, 1, 2, 3])) {
            if (left <= 0 || !R.chance(0.5)) break;
            const x = c[0] + DX[d], y = c[1] + DY[d];
            if (lit(x, y) && rid[y * W + x] === r.id) { G.beams.push({ x, y }); left--; }
          }
        }
      }
    }
    // ----- hieroglyfväggar (gravkammaren): runt specialrum, skattrum, valv och gravkamrar, och några sträckor längs korridorerna;
    // aldrig vid den hemliga/spruckna väggen (den ritas i sandsten) och aldrig i kanten -----
    if (tomb) {
      const R = fk('glyphs'), conv = (x, y) => { if (G.inb(x, y) && g[y][x] === 'È') g[y][x] = 'Ì'; };
      for (const r of rooms) if (['special', 'treasure', 'shrine', 'vault', 'shop'].includes(r.type) || r.arch === 'burialchamber')
        for (const [x, y] of r.cells) for (let k = 0; k < 8; k++) conv(x + RX[k], y + RY[k]);
      for (let k = R.int(3, 6); k > 0 && cor.length; k--) {
        let [x, y] = R.pick(cor);
        const hz = isWall(g[y - 1][x]) || isWall(g[y + 1][x]), side = R.chance(0.5) ? 1 : -1;
        for (let t = R.int(3, 6); t > 0 && !isWall(g[y][x]); t--) { if (hz) conv(x, y + side); else conv(x + side, y); if (hz) x++; else y++; }
      }
      for (let y = 1; y < G.H - 1; y++) for (let x = 1; x < W - 1; x++) if (g[y][x] === '*' || g[y][x] === '{')
        for (let yy = y - 2; yy <= y + 2; yy++) for (let xx = x - 2; xx <= x + 2; xx++) if (G.inb(xx, yy) && g[yy][xx] === 'Ì') g[yy][xx] = 'È';
    }
    return true;
  }

  // ---------- Version 8: kristallgrottorna, sjunkna staden, nya fiender, NPC:er och föremål ----------
  // Körs allra sist i content med egna slumpflöden (forks av content-slumpens 'v8'): allt från version 7 ligger kvar och de nya sakerna
  // läggs ovanpå. Kristallgrottornas och sjunkna stadens egna saker läggs alltid; de nya sakerna i alla biomer (Ā Ă Ğ Ġ Ģ) bara utan
  // opts.v8off. I de gamla biomerna misslyckas den aldrig; underkänns banan ändå tas de nya sakerna bort igen (opts.v8.undo, se build7).
  const SPIKES8_CAP = 24, TIDE_CAP = 48;
  function content8(G, depth, opts, L, H) {
    const { W, g, lock, fm } = G, { rooms, fight, P, cnt, set, place, trapOK, nearCh, farFromP, rid, size } = H, b = L.biome;
    const fk = tag => H.rng.fork(tag), cor = L.corridors || [], N = W * G.H;
    const crystal = b === 'crystal', sunken = b === 'sunken';
    if (opts.v8) { opts.v8.added = false; opts.v8.undo = []; if (crystal || sunken) opts.v8.keep = true; }
    const undo = opts.v8 ? opts.v8.undo : [], put8 = (x, y, ch) => { undo.push([x, y, g[y][x]]); g[y][x] = ch; cnt[ch] = (cnt[ch] || 0) + 1; };
    const front = (x, y) => [0, 1, 2, 3].some(k => isWall(g[y + DY[k]][x + DX[k]]) && g[y - DY[k]][x - DX[k]] === '.' && lock[(y - DY[k]) * W + x - DX[k]] < 2);
    const enemyFree = r => r.type === 'shop' || r.type === 'shrine' || r.type === 'treasure' || (r.type === 'special' && r.special !== 'challenge');
    // ett nytt hinder får inte stänga in en kruka, spikfälla, lavaruta o.d.: de behåller en fri granne (vatten: en fri granne eller mer vatten)
    const safe8 = (x, y) => [0, 1, 2, 3].every(d => {
      const nx = x + DX[d], ny = y + DY[d], c = g[ny][nx];
      if (!genBlk(c) || isBlock(c)) return true;
      const wet = isWet(c);
      return [0, 1, 2, 3].some(e => { const mx = nx + DX[e], my = ny + DY[e]; if (mx === x && my === y) return false; const m = G.at(mx, my); return !genBlk(m) || (wet && isWet(m)); });
    });
    const gRoom = rooms.find(r => r.type === 'guardian'), inG = (x, y) => !!gRoom && rid[y * W + x] === gRoom.id;
    const hidden = [];
    for (let y = 1; y < G.H - 1; y++) for (let x = 1; x < W - 1; x++) if (g[y][x] === '*' || g[y][x] === '{') hidden.push([x, y]);
    // väggruta som syns (har golv intill) och inte ligger vid den hemliga/spruckna väggen
    const face = (x, y, ch) => x >= 0 && y >= 0 && x < W && y < G.H && g[y][x] === ch && !hidden.some(([hx, hy]) => cheb(hx, hy, x, y) <= 2)
      && [0, 1, 2, 3].some(d => { const c = G.at(x + DX[d], y + DY[d]); return !isWall(c); });
    // glesa sträckor (1-4 rutor) av tecknet to i väggarna av tecknet from
    const veins = (R, from, to, p) => {
      for (let y = 0; y < G.H; y++) for (let x = 0; x < W; x++) {
        if (!face(x, y, from) || !R.chance(p)) continue;
        g[y][x] = to;
        let cx = x, cy = y;
        for (let k = R.int(0, 3); k > 0; k--) {
          const nb = [0, 1, 2, 3].map(d => [cx + DX[d], cy + DY[d]]).filter(([nx, ny]) => face(nx, ny, from));
          if (!nb.length) break;
          [cx, cy] = R.pick(nb); g[cy][cx] = to;
        }
      }
    };

    // ----- kristallgrottorna: glödkristaller, brytande kristaller, spikfläckar och ådror -----
    if (crystal) {
      // glödkristaller Ę i stället för eldfat och glödande kristaller i stället för kandelabrar (utom i vaktarens sal)
      for (let y = 1; y < G.H - 1; y++) for (let x = 1; x < W - 1; x++) {
        const c = g[y][x];
        if ((c !== 'f' && c !== 'c') || inG(x, y)) continue;
        const to = c === 'f' ? 'Ę' : 'i';
        g[y][x] = to; cnt[c]--; cnt[to] = (cnt[to] || 0) + 1;
      }
      // brytande kristaller (1-4): fritt i stora rum (minst 36 rutor, prismasalarna först), aldrig vid P, stänger aldrig av något
      {
        const R = fk('prisms'), want = R.int(1, 4);
        const big = R.shuffle(rooms.filter(r => size(r) >= 36 && ['normal', 'elite', 'exit', 'treasure', 'start'].includes(r.type)))
          .sort((p, q) => (q.arch === 'prismhall' ? 1 : 0) - (p.arch === 'prismhall' ? 1 : 0));
        for (let pass = 0; pass < 3; pass++) for (const r of big) {
          if ((cnt['Ė'] || 0) >= want) break;
          place(r, 'Ė', 1, { open: true, spread: 3, avoid: ['Ė', 2], pred: (x, y) => cheb(x, y, P[0], P[1]) >= 3 && safe8(x, y), rng: R });
        }
      }
      // kristallspikar: 2-4 fläckar om 2-6 rutor i stridsrummen och skattrummen (skärvfälten först), aldrig vid dörrar, P eller x
      {
        const R = fk('spikes'), ok = (x, y) => trapOK(x, y) && localOK(G, x, y) && safe8(x, y);
        const hosts = R.shuffle(rooms.filter(r => H.isCombat(r) || r.type === 'treasure')).sort((p, q) => (q.arch === 'shardfield' ? 1 : 0) - (p.arch === 'shardfield' ? 1 : 0));
        let patches = R.int(2, 4);
        for (const r of hosts) {
          if (patches <= 0) break;
          for (let k = r.arch === 'shardfield' ? 2 : 1; k > 0 && patches > 0; k--) {
            const s = R.shuffle(r.cells.filter(([x, y]) => ok(x, y)))[0];
            if (!s) break;
            const want = R.int(2, 6), done = [], fr = [s], seen = new Set([s[1] * W + s[0]]);
            while (fr.length && done.length < want && (cnt['Ē'] || 0) < SPIKES8_CAP) {
              const [x, y] = fr.splice(R.int(0, fr.length - 1), 1)[0];
              if (!ok(x, y)) continue;
              set(x, y, 'Ē'); done.push([x, y]);
              for (let d = 0; d < 4; d++) { const nx = x + DX[d], ny = y + DY[d], ni = ny * W + nx; if (!seen.has(ni) && rid[ni] === r.id) { seen.add(ni); fr.push([nx, ny]); } }
            }
            if (done.length === 1) { const [x, y] = done[0]; g[y][x] = '.'; cnt['Ē']--; } else if (done.length) patches--;
          }
        }
      }
      // kristallådror Ć: glesa sträckor i väggarna
      veins(fk('veins'), 'Ą', 'Ć', 0.05);
    }

    // ----- sjunkna staden: kanaler, tidvatten, luftbubblor, ålar, vrakkistor, vattenskatt, korall och vattnets golv -----
    if (sunken) {
      // kanaler i korridorerna där de är minst två rutor breda (localOK: aldrig enda vägen), helst intill vatten
      {
        const R = fk('canals'), c = R.shuffle(cor.filter(([x, y]) => rid[y * W + x] < 0));
        let n = R.int(0, 14);
        for (let pass = 0; pass < 3 && n > 0; pass++) for (const [x, y] of c) {
          if (n <= 0) break;
          if (g[y][x] !== '.' || (pass < 2 && !nearCh(x, y, 'Đ', 1)) || !trapOK(x, y) || !localOK(G, x, y) || !safe8(x, y)) continue;
          set(x, y, 'Đ'); n--;
        }
      }
      // tidvatten: grunda rutor längs stränderna (intill djupt vatten), aldrig vid dörrar, P eller x, aldrig enda vägen
      {
        const R = fk('tide'), want = R.int(10, 30), c = [];
        const shore = (x, y) => [0, 1, 2, 3].some(d => g[y + DY[d]][x + DX[d]] === 'Đ');
        for (let y = 1; y < G.H - 1; y++) for (let x = 1; x < W - 1; x++) if (g[y][x] === '.' && !inG(x, y) && shore(x, y)) c.push([x, y]);
        let n = 0;
        for (const [x, y] of R.shuffle(c)) {
          if (n >= want || (cnt['Ĕ'] || 0) >= TIDE_CAP) break;
          if (g[y][x] === '.' && shore(x, y) && trapOK(x, y) && localOK(G, x, y) && safe8(x, y)) { set(x, y, 'Ĕ'); n++; }
        }
      }
      // luftbubblor: en ruta mitt i de flesta bassänger och kanaler om minst 8 rutor (högst 4)
      {
        const R = fk('bubbles'), seen = new Uint8Array(N);
        let n = 0;
        for (let i = 0; i < N && n < 4; i++) {
          if (seen[i] || g[(i / W) | 0][i % W] !== 'Đ') continue;
          const comp = [], st = [i]; seen[i] = 1;
          while (st.length) {
            const cur = st.pop(); comp.push(cur);
            for (let d = 0; d < 4; d++) { const ni = cur + DX[d] + DY[d] * W; if (!seen[ni] && g[(ni / W) | 0][ni % W] === 'Đ') { seen[ni] = 1; st.push(ni); } }
          }
          if (comp.length < 8 || !R.chance(0.8)) continue;
          const mid = comp.filter(j => { const x = j % W, y = (j / W) | 0; return !inG(x, y) && [0, 1, 2, 3].filter(d => g[y + DY[d]][x + DX[d]] === 'Đ').length >= 2; });
          if (!mid.length) continue;
          const j = R.pick(mid); g[(j / W) | 0][j % W] = 'Ĝ'; cnt['Đ']--; cnt['Ĝ'] = (cnt['Ĝ'] || 0) + 1; n++;
        }
      }
      // ålar (1-3): en fiende i ett stridsrum flyttas ut i rummets vatten (gruppernas storlek står kvar), långt från P
      {
        const R = fk('eels'), mob = FOE_FROM + 'ÃÊËÍÏÚÛ';
        let n = R.chance(0.88) ? R.int(1, 3) : 0;
        for (const r of R.shuffle(fight.slice())) {
          if (n <= 0) break;
          const spots = r.cells.filter(([x, y]) => g[y][x] === 'Đ' && farFromP(x, y) && [0, 1, 2, 3].filter(d => 'ĐĜ'.includes(g[y + DY[d]][x + DX[d]])).length >= 2);
          const movers = r.cells.filter(([x, y]) => mob.includes(g[y][x]));
          if (!spots.length || !movers.length) continue;
          const s = R.pick(spots), m = R.pick(movers);
          g[m[1]][m[0]] = '.'; g[s[1]][s[0]] = 'Ó'; cnt['Đ']--; cnt['Ó'] = (cnt['Ó'] || 0) + 1; n--;
        }
      }
      // vrakkistor (1-2 på land, med fri framsida): vraksalarna först, sedan skattrum och stridsrum
      {
        const R = fk('wrecks'), pri = r => (r.arch === 'wreckhall' ? 0 : r.type === 'treasure' ? 1 : H.isCombat(r) ? 2 : 3);
        const host = R.shuffle(rooms.filter(r => !['guardian', 'secret', 'vault', 'start', 'shop', 'special'].includes(r.type))).sort((p, q) => pri(p) - pri(q));
        let want = R.int(1, 2);
        for (const r of host) { if (want <= 0) break; if (place(r, 'Ě', 1, { wall: true, pred: (x, y) => front(x, y) && safe8(x, y), rng: R }).length) want--; }
      }
      // vattenskatt (~60 % av banorna med en tillräckligt stor bassäng): en holme mitt i en bassäng (alla fyra grannar och minst sex av de
      // åtta runt om djupt vatten) med en vrakkista (eller guld); nås bara simmande
      {
        const R = fk('islet');
        if (R.chance(0.6)) {
          const c = [];
          for (const r of rooms) if (!['guardian', 'vault', 'secret', 'start'].includes(r.type)) for (const [x, y] of r.cells)
            if (g[y][x] === 'Đ' && [0, 1, 2, 3].every(d => g[y + DY[d]][x + DX[d]] === 'Đ') && RX.filter((dx, k) => g[y + RY[k]][x + dx] === 'Đ').length >= 6) c.push([x, y]);
          if (c.length) { const [x, y] = R.pick(c); cnt['Đ']--; set(x, y, H.can('Ě') ? 'Ě' : '$'); }
        }
      }
      // korall Č: där vattnet når ruinmuren och i glesa sträckor
      {
        const R = fk('coral');
        for (let y = 0; y < G.H; y++) for (let x = 0; x < W; x++) {
          if (!face(x, y, 'Ċ')) continue;
          if (RX.some((dx, k) => WATER8.includes(G.at(x + dx, y + RY[k]))) && R.chance(0.6)) g[y][x] = 'Č';
        }
        veins(R, 'Ċ', 'Č', 0.04);
      }
      // vattnets golv: djupt vatten (Đ Ĝ Ó) och tidvatten (Ĕ)
      const dw = H.floorIdx('floor_deepwater'), sh = H.floorIdx('floor_shallow');
      let wet = 0;
      for (let y = 0; y < G.H; y++) for (let x = 0; x < W; x++) {
        const c = g[y][x];
        if (c === 'Đ' || c === 'Ĝ' || c === 'Ó') { wet++; if (dw >= 0) fm[y * W + x] = dw; } else if (c === 'Ĕ' && sh >= 0) fm[y * W + x] = sh;
      }
      if (wet < 12) return false;
    }

    // ----- alla biomer: skuggjägare, häxa, kartografen, talangaltare och kunskapsböcker -----
    if (!opts.v8off) {
      let added = false;
      {
        const R = fk('foes'), mob = FOE_FROM + 'ÃÊËÍÏÚÛ';
        const swapIn = ch => {
          for (const r of R.shuffle(fight.filter(r => r.arch !== 'nest'))) { // (spindelboet behåller sina spindlar)
            const c = r.cells.filter(([x, y]) => mob.includes(g[y][x]));
            if (!c.length) continue;
            const [x, y] = R.pick(c); put8(x, y, ch); return true;
          }
          return false;
        };
        if (depth >= 2 && R.chance(0.2) && swapIn('Ā')) added = true;
        if (depth >= 3 && R.chance(0.2) && swapIn('Ă')) added = true;
      }
      {
        const R = fk('npc');
        const host = R.shuffle(rooms.filter(enemyFree)).sort((p, q) => size(p) - size(q)).concat(rooms.filter(r => r.type === 'start'));
        const put = (r, ch) => place(r, ch, 1, { wall: true, center: true, jit: 2, pred: (x, y) => front(x, y) && safe8(x, y), rng: R })[0]
          || place(r, ch, 1, { center: true, pred: safe8, rng: R })[0] || null;
        let p;
        if (R.chance(0.16)) for (const r of host) if ((p = put(r, 'Ğ'))) { undo.push([p[0], p[1], '.']); added = true; break; }
        if (R.chance(0.26)) for (const r of host) if ((p = put(r, 'Ġ'))) { undo.push([p[0], p[1], '.']); added = true; break; }
      }
      {
        const R = fk('books'), loot = rooms.filter(r => r.type !== 'guardian' && r.type !== 'shop' && r.type !== 'start');
        const nB = R.chance(0.36) ? (R.chance(0.25) ? 2 : 1) : 0;
        for (let k = 0; k < nB; k++) for (let t = 0; t < 6; t++) {
          const r = R.weighted(loot, r => (r.type === 'secret' ? 5 : r.type === 'vault' || r.type === 'treasure' ? 3 : 1));
          const p = r && place(r, 'Ģ', 1, { rng: R })[0];
          if (p) { undo.push([p[0], p[1], '.']); added = true; break; }
        }
      }
      if (added && opts.v8) opts.v8.added = true;
    }
    return true;
  }

  // ---------- Version 9: klocktornet, molnborgen, kugghjul och fjädrar ----------
  // Körs allra sist i content med egna slumpflöden (forks av content-slumpens 'v9'): allt från version 8 ligger kvar och de nya sakerna
  // läggs ovanpå. Klocktornets och molnborgens egna saker läggs alltid (opts.v9.keep); kugghjul Ŋ och fjädrar ŋ i alla biomer läggs med
  // en ångra-lista (opts.v9.undo): underkänns banan tas de bort igen och banan blir exakt som i version 8 (se build7).
  // Lägger sågspåren i G.saws ([{ x0, y0, x1, y1 }]) och vindrutorna i G.winds ([{ x, y, dx, dy }]).
  function content9(G, depth, opts, L, H) {
    const { W, g, lock, fm } = G, { rooms, fight, P, X, cnt, set, place, trapOK, nearPX, rid, size } = H, b = L.biome;
    const fk = tag => H.rng.fork(tag), cor = L.corridors || [], N = W * G.H;
    const clock = b === 'clock', sky = b === 'sky';
    G.saws = []; G.winds = [];
    if (opts.v9) { opts.v9.added = false; opts.v9.undo = []; if (clock || sky) opts.v9.keep = true; }
    const undo = opts.v9 ? opts.v9.undo : [];
    const edge = c => isWall(c) || c === 'Ń'; // vägg eller tomrum (öns kant)
    // fri framsida: vägg/tomrum bakom, fritt golv framför
    const front = (x, y) => [0, 1, 2, 3].some(k => edge(g[y + DY[k]][x + DX[k]]) && g[y - DY[k]][x - DX[k]] === '.' && lock[(y - DY[k]) * W + x - DX[k]] < 2);
    const freeSide = (x, y) => [0, 1, 2, 3].some(d => !isBlock(g[y + DY[d]][x + DX[d]]));
    const enemyFree = r => r.type === 'shop' || r.type === 'shrine' || r.type === 'treasure' || (r.type === 'special' && r.special !== 'challenge');
    // ett nytt hinder får inte stänga in en kruka, spikfälla, lavaruta o.d.: de behåller en fri granne (vatten: en fri granne eller mer vatten)
    const safe9 = (x, y) => [0, 1, 2, 3].every(d => {
      const nx = x + DX[d], ny = y + DY[d], c = g[ny][nx];
      if (!genBlk(c) || isBlock(c)) return true;
      const wet = isWet(c);
      return [0, 1, 2, 3].some(e => { const mx = nx + DX[e], my = ny + DY[e]; if (mx === x && my === y) return false; const m = G.at(mx, my); return !genBlk(m) || (wet && isWet(m)); });
    });
    const gRoom = rooms.find(r => r.type === 'guardian'), inG = (x, y) => !!gRoom && rid[y * W + x] === gRoom.id;
    // ingen ny fara intill en annan (sågspår, tidsbubbla, vindruta) utom den egna sträckans rutor
    const touch = (x, y, chs, own) => RX.some((dx, k) => { const xx = x + dx, yy = y + RY[k], c = G.at(xx, yy); return chs.includes(c) && !own.some(p => p[0] === xx && p[1] === yy); });

    // ----- klocktornet: kuggväggar, urverk, sågspår, tidsbubblor, klockspel och kuggspindlar -----
    if (clock) {
      // kuggväggar ĺ: glesa sträckor (1-4 rutor) i de synliga mässingsväggarna, aldrig vid den hemliga/spruckna väggen
      {
        const R = fk('gearwalls'), hidden = [];
        for (let y = 1; y < G.H - 1; y++) for (let x = 1; x < W - 1; x++) if (g[y][x] === '*' || g[y][x] === '{') hidden.push([x, y]);
        const face = (x, y) => x >= 0 && y >= 0 && x < W && y < G.H && g[y][x] === 'Ĺ' && !hidden.some(([hx, hy]) => cheb(hx, hy, x, y) <= 2)
          && [0, 1, 2, 3].some(d => !isWall(G.at(x + DX[d], y + DY[d])));
        for (let y = 0; y < G.H; y++) for (let x = 0; x < W; x++) {
          if (!face(x, y) || !R.chance(0.05)) continue;
          g[y][x] = 'ĺ';
          let cx = x, cy = y;
          for (let k = R.int(0, 3); k > 0; k--) {
            const nb = [0, 1, 2, 3].map(d => [cx + DX[d], cy + DY[d]]).filter(([nx, ny]) => face(nx, ny));
            if (!nb.length) break;
            [cx, cy] = R.pick(nb); g[cy][cx] = 'ĺ';
          }
        }
      }
      // urverk Ņ (ljuskälla) i stället för ungefär vartannat eldfat, utom i vaktarens sal
      {
        const R = fk('clockworks');
        for (let y = 1; y < G.H - 1; y++) for (let x = 1; x < W - 1; x++) if (g[y][x] === 'f' && !inG(x, y) && R.chance(0.5)) { g[y][x] = 'Ņ'; cnt.f--; cnt['Ņ'] = (cnt['Ņ'] || 0) + 1; }
      }
      // sågspår Ŀ: 2-5 raka spår om 3-7 rutor i korridorerna och längs väggarna i strids- och skattrummen; varje ruta läggs med localOK
      // (aldrig enda vägen), aldrig vid dörrar, P eller x, aldrig intill ett annat spår
      {
        const R = fk('saws'), want = R.int(2, 4) + (depth >= 3 ? 1 : 0);
        const host = new Uint8Array(rooms.length);
        for (const r of rooms) if (H.isCombat(r) || r.type === 'treasure') host[r.id] = 1;
        const okS = (x, y, own) => trapOK(x, y) && !inG(x, y) && safe9(x, y) && !touch(x, y, 'Ŀŀ', own);
        const starts = R.shuffle(cor.filter(([x, y]) => rid[y * W + x] < 0).concat(...rooms.filter(r => host[r.id]).map(r => r.cells)));
        const more = R.shuffle([].concat(...rooms.filter(r => !host[r.id] && !['guardian', 'vault', 'secret', 'shop'].includes(r.type)).map(r => r.cells)));
        // först längs väggarna, sedan även tvärs över rummen, sist (om inget spår fick plats) i startrummet och rummen utan fiender
        for (let pass = 0; pass < 3; pass++) for (const [sx, sy] of pass < 2 ? starts : G.saws.length ? [] : more) {
          if (G.saws.length >= want) break;
          const reg = rid[sy * W + sx];
          if (!okS(sx, sy, []) || (pass === 2 && cheb(sx, sy, P[0], P[1]) < 3)) continue;
          for (const d of R.shuffle([0, 1])) {
            const dx = d ? 0 : 1, dy = d ? 1 : 0, len = R.int(3, 7), cells = [];
            for (let k = 0; k < len; k++) {
              const x = sx + dx * k, y = sy + dy * k;
              if (!G.inb(x, y) || rid[y * W + x] !== reg || !okS(x, y, cells)) break;
              if (!pass && reg >= 0 && !isWall(g[y - dx][x - dy]) && !isWall(g[y + dx][x + dy])) break; // i rummen: längs en vägg
              if (pass === 2 && cheb(x, y, P[0], P[1]) < 3) break;
              if (!localOK(G, x, y)) break;
              g[y][x] = 'Ŀ'; cells.push([x, y]);
            }
            if (cells.length >= 3) {
              cnt['Ŀ'] = (cnt['Ŀ'] || 0) + cells.length;
              const [a, z] = [cells[0], cells[cells.length - 1]];
              G.saws.push({ x0: a[0], y0: a[1], x1: z[0], y1: z[1] });
              break;
            }
            for (const [x, y] of cells) g[y][x] = '.';
          }
        }
      }
      // tidsbubblor ŀ (1-3): mitt i stora strids- och skattrum (fritt runt om, radie ~2), långt från P och x och från varandra
      {
        const R = fk('bubbles'), want = R.int(1, 3), done = [];
        const roomy2 = (x, y) => { let k = 0; for (let yy = y - 2; yy <= y + 2; yy++) for (let xx = x - 2; xx <= x + 2; xx++) if (!isBlock(G.at(xx, yy))) k++; return k >= 16; };
        for (const r of R.shuffle(rooms.filter(r => (H.isCombat(r) || r.type === 'treasure') && size(r) >= 16))) {
          if (done.length >= want) break;
          const c = r.cells.filter(([x, y]) => trapOK(x, y) && cheb(x, y, P[0], P[1]) >= 4 && cheb(x, y, X[0], X[1]) >= 3 && done.every(p => cheb(p[0], p[1], x, y) >= 6) && roomy2(x, y))
            .map(([x, y]) => [x, y, Math.hypot(x - r.cx, y - r.cy) + R.next() * 2]).sort((p, q) => p[2] - q[2]);
          for (const [x, y] of c) if (!touch(x, y, 'Ŀŀń', []) && localOK(G, x, y) && safe9(x, y)) { set(x, y, 'ŀ'); done.push([x, y]); break; }
        }
      }
      // klockspel Ň (~60 %): i ett rum utan fiender (annars startrummet eller ett stridsrum), fri framsida
      {
        const R = fk('chime');
        if (R.chance(0.6)) {
          const host = R.shuffle(rooms.filter(enemyFree)).sort((p, q) => size(p) - size(q)).concat(rooms.filter(r => r.type === 'start'), R.shuffle(fight.slice()));
          for (const r of host) {
            const p = place(r, 'Ň', 1, { wall: true, center: true, jit: 2, pred: (x, y) => front(x, y) && safe9(x, y), rng: R })[0]
              || place(r, 'Ň', 1, { center: true, pred: (x, y) => freeSide(x, y) && safe9(x, y), rng: R })[0];
            if (p) break;
          }
        }
      }
      // kuggspindlar Ĵ: en hel grupp (3-5) i ett stridsrum (~80 %, djup 3+ ibland två grupper); urverkssoldaterna står kvar
      {
        const R = fk('spiders'), mobS = FOE_FROM + 'ĳ';
        let groups = R.chance(0.8) ? (depth >= 3 && R.chance(0.3) ? 2 : 1) : 0;
        for (const r of R.shuffle(fight.filter(r => r.arch !== 'nest'))) {
          if (groups <= 0) break;
          const c = r.cells.filter(([x, y]) => mobS.includes(g[y][x]));
          if (c.length < 3) continue;
          for (const [x, y] of c.slice(0, 5)) { cnt[g[y][x]]--; g[y][x] = 'Ĵ'; cnt['Ĵ'] = (cnt['Ĵ'] || 0) + 1; }
          groups--;
        }
      }
    }

    // ----- molnborgen: väggarna blir tomrum, öarnas kanter, vindrutor, blixtstänger, molnkistor och molnjättar -----
    if (sky) {
      const R = fk('void'), VF = H.floorIdx('floor_void'), gw = GUARDIANS[L.gid] ? GUARDIANS[L.gid].wall : '';
      // broarna är öppna: vanliga dörrar blir golv (grindar, låsta dörrar och hemliga/spruckna väggar står kvar med sina karmar)
      for (let y = 1; y < G.H - 1; y++) for (let x = 1; x < W - 1; x++) if (g[y][x] === 'D') g[y][x] = '.';
      const keep = new Uint8Array(N);
      const mark8 = (x, y) => { for (let k = 0; k < 8; k++) { const xx = x + RX[k], yy = y + RY[k]; if (xx >= 0 && yy >= 0 && xx < W && yy < G.H) keep[yy * W + xx] = 1; } };
      for (let y = 1; y < G.H - 1; y++) for (let x = 1; x < W - 1; x++) { const c = g[y][x]; if (isDoorCh(c) || c === 'P' || c === 'x') mark8(x, y); }
      for (const r of rooms) if (r.type === 'vault' || r.type === 'secret') for (const [x, y] of r.cells) mark8(x, y); // valven och de hemliga rummen: små stenhus
      // pelare: väggklungor om högst 4 rutor som inte når kanten
      {
        const lab = new Uint8Array(N), st = [];
        for (let i = 0; i < N; i++) {
          const x0 = i % W, y0 = (i / W) | 0;
          if (lab[i] || !G.inb(x0, y0) || !isWall(g[y0][x0])) continue;
          const comp = [i]; let border = false; lab[i] = 1; st.push(i);
          while (st.length) {
            const c = st.pop(), x = c % W, y = (c / W) | 0;
            for (let k = 0; k < 8; k++) {
              const xx = x + RX[k], yy = y + RY[k], j = yy * W + xx;
              if (!isWall(G.at(xx, yy))) continue;
              if (!G.inb(xx, yy)) { border = true; continue; }
              if (lab[j]) continue;
              lab[j] = 1; comp.push(j); st.push(j);
            }
          }
          if (!border && comp.length <= 4) for (const j of comp) keep[j] = 1;
        }
      }
      // låga murar: glesa korta sträckor av väggrutor intill golvet (vaktarens väggring tätare)
      {
        const faceW = (x, y) => G.inb(x, y) && isWall(g[y][x]) && RX.some((dx, k) => !isWall(G.at(x + dx, y + RY[k])));
        const list = [];
        for (let y = 1; y < G.H - 1; y++) for (let x = 1; x < W - 1; x++) if (faceW(x, y)) list.push([x, y]);
        for (const [x, y] of R.shuffle(list)) {
          if (keep[y * W + x] || !R.chance(g[y][x] === gw ? 0.3 : 0.07)) continue;
          keep[y * W + x] = 1;
          let cx = x, cy = y;
          for (let k = R.int(0, 2); k > 0; k--) {
            const nb = [0, 1, 2, 3].map(d => [cx + DX[d], cy + DY[d]]).filter(([nx, ny]) => faceW(nx, ny) && !keep[ny * W + nx]);
            if (!nb.length) break;
            [cx, cy] = R.pick(nb); keep[cy * W + cx] = 1;
          }
        }
      }
      // resten av väggarna blir tomrum (golv floor_void); kanten är stormmur, de kvarstående murarna molnsten eller stormmur
      for (let y = 0; y < G.H; y++) for (let x = 0; x < W; x++) {
        const c = g[y][x], i = y * W + x;
        if (!G.inb(x, y)) { g[y][x] = 'Ľ'; continue; }
        if (!isWall(c)) continue;
        if (!keep[i]) { g[y][x] = 'Ń'; fm[i] = VF; } else if (c === 'ļ' && R.chance(0.3)) g[y][x] = 'Ľ';
      }
      // pilplattor som inte längre har en vägg inom 6 rutor blir golv
      for (let y = 1; y < G.H - 1; y++) for (let x = 1; x < W - 1; x++) if (g[y][x] === '<') {
        let ok = false;
        for (let d = 0; d < 4 && !ok; d++) for (let k = 1; k <= 6; k++) { const c = G.at(x + DX[d] * k, y + DY[d] * k); if (isWall(c)) { ok = true; break; } if (isBlock(c)) break; }
        if (!ok) { g[y][x] = '.'; cnt['<']--; }
      }
      // öarnas hörn faller bort; vaktarens sal får tomrum runt kanterna men inte i den fria mitten (5x5 runt Z är låst)
      {
        const zc = L.guardian.center, voidN = (x, y) => [0, 1, 2, 3].filter(d => g[y + DY[d]][x + DX[d]] === 'Ń').length;
        for (const r of rooms) {
          if (r.type === 'vault' || r.type === 'secret') continue;
          const isG = r.type === 'guardian';
          for (const [x, y] of R.shuffle(r.cells.slice())) {
            if (g[y][x] !== '.' || lock[y * W + x] || nearPX(x, y)) continue;
            const vn = voidN(x, y);
            if (isG ? (vn < 1 || cheb(x, y, zc[0], zc[1]) < 3 || !R.chance(0.45)) : (vn < 2 || !R.chance(0.5))) continue;
            if ([0, 1, 2, 3].some(d => isDoorCh(g[y + DY[d]][x + DX[d]])) || !localOK(G, x, y) || !safe9(x, y)) continue;
            g[y][x] = 'Ń'; fm[y * W + x] = VF;
          }
        }
      }
      // vindrutor ń: 2-4 vindbyar om 2-4 rutor i rad på broarna; vinden blåser längs bron, aldrig ut i tomrummet
      {
        const R2 = fk('winds'), WF = H.floorIdx('floor_wind');
        let lanes = R2.int(2, 4);
        for (const [sx, sy] of R2.shuffle(cor.filter(([x, y]) => rid[y * W + x] < 0 && g[y][x] === '.'))) {
          if (lanes <= 0) break;
          for (const d of R2.shuffle([0, 1, 2, 3])) {
            const dx = DX[d], dy = DY[d], len = R2.int(2, 4), cells = [];
            for (let k = 0; k < len; k++) {
              const x = sx + dx * k, y = sy + dy * k;
              if (!G.inb(x, y) || rid[y * W + x] >= 0 || g[y][x] !== '.' || !trapOK(x, y) || touch(x, y, 'ńŀ', cells)) break;
              cells.push([x, y]);
            }
            if (cells.length < 2) continue;
            const [lx, ly] = cells[cells.length - 1], t = G.at(lx + dx, ly + dy);
            if (isBlock(t) || t === 'ń') continue;
            for (const [x, y] of cells) { g[y][x] = 'ń'; if (WF >= 0) fm[y * W + x] = WF; G.winds.push({ x, y, dx, dy }); }
            cnt['ń'] = (cnt['ń'] || 0) + cells.length;
            lanes--;
            break;
          }
        }
      }
      // blixtstänger ņ (2-4 till utöver stormspirornas): helst vid öns kant, aldrig nära P
      {
        const R2 = fk('rods'), want = R2.int(2, 4) + (cnt['ņ'] || 0), voidAdj = (x, y) => RX.some((dx, k) => G.at(x + dx, y + RY[k]) === 'Ń');
        const host = R2.shuffle(rooms.filter(r => !['guardian', 'vault', 'secret', 'start', 'shop'].includes(r.type))).concat(rooms.filter(r => r.type === 'start'));
        for (let pass = 0; pass < 3; pass++) for (const r of host) { // vid kanten, sedan var som helst, sist tätare
          if ((cnt['ņ'] || 0) >= want) break;
          place(r, 'ņ', 1, pass < 2 ? { spread: 4, avoid: ['ņ', 3], pred: (x, y) => (pass || voidAdj(x, y)) && safe9(x, y) && cheb(x, y, P[0], P[1]) >= 3, rng: R2 }
            : { pred: (x, y) => safe9(x, y) && cheb(x, y, P[0], P[1]) >= 2, rng: R2 });
        }
      }
      // molnkistor ň (1-3): skattrummen först, sedan stridsrummen; fri framsida
      {
        const R2 = fk('chests'), pri = r => (r.type === 'treasure' ? 0 : H.isCombat(r) ? 1 : 2);
        const host = R2.shuffle(rooms.filter(r => !['guardian', 'secret', 'vault', 'start', 'shop', 'special'].includes(r.type))).sort((p, q) => pri(p) - pri(q));
        let want = R2.int(1, 3);
        for (const r of host) { if (want <= 0) break; if (place(r, 'ň', 1, { pred: (x, y) => front(x, y) && safe9(x, y), rng: R2 }).length) want--; }
      }
      // molnjättar ĸ (djup 3+, ~55 %, 1-2): byts in mot redan utplacerade fiender i stora stridsrum
      {
        const R2 = fk('giants'), mobG = FOE_FROM + 'Ķķ';
        let n = depth >= 3 && R2.chance(0.55) ? (R2.chance(0.3) ? 2 : 1) : 0;
        for (const r of R2.shuffle(fight.filter(r => size(r) >= 30))) {
          if (n <= 0) break;
          const c = r.cells.filter(([x, y]) => mobG.includes(g[y][x]));
          if (!c.length) continue;
          const [x, y] = R2.pick(c); cnt[g[y][x]]--; g[y][x] = 'ĸ'; cnt['ĸ'] = (cnt['ĸ'] || 0) + 1; n--;
        }
      }
    }

    // ----- alla biomer: kugghjul (~30 %, klocktornet ~50 %, 1-3) och fjädrar (~15 %, molnborgen ~25 %, högst 1) -----
    {
      let added = false;
      const loot = rooms.filter(r => r.type !== 'guardian' && r.type !== 'shop' && r.type !== 'start');
      const drop = (R, ch, n, wt) => {
        for (let k = 0; k < n; k++) for (let t = 0; t < 6; t++) {
          const r = R.weighted(loot, wt), p = r && place(r, ch, 1, { rng: R })[0];
          if (p) { undo.push([p[0], p[1], '.']); added = true; break; }
        }
      };
      const RG = fk('gears'), RF = fk('feathers');
      drop(RG, 'Ŋ', RG.chance(clock ? 0.5 : 0.3) ? RG.int(1, 3) : 0, r => (r.type === 'secret' ? 3 : r.type === 'vault' || r.type === 'treasure' ? 2 : 1));
      drop(RF, 'ŋ', RF.chance(sky ? 0.25 : 0.15) ? 1 : 0, r => (r.type === 'secret' ? 5 : r.type === 'vault' || r.type === 'treasure' ? 3 : 1));
      if (added && opts.v9) opts.v9.added = true;
    }
    return true;
  }

  // ---------- Version 10: nya invånare i de gamla biomerna och legendaltaret ----------
  // FOES10: tecken -> { home: biomen där den är infödd, near: närliggande biomer där den är sällsynt, d: första djup, p: andel banor hemma,
  //   n: [min, max] per bana hemma (sällsynt: n[0]), max: tak (validate), group: alltid en hel grupp i samma stridsrum }
  const FOES10 = {
    'Ō': { home: 'dungeon', near: ['courtyard'], d: 1, p: 0.55, n: [1, 3], max: 4 }, // fångvaktare
    'ō': { home: 'caves', near: ['graveyard'], d: 2, p: 0.55, n: [1, 3], max: 4 }, // grävare (aldrig i/intill vatten)
    'Ŏ': { home: 'graveyard', near: ['dungeon'], d: 1, p: 0.55, n: [1, 2], max: 2 }, // likgrävare
    'ŏ': { home: 'forest', near: ['swamp'], d: 1, p: 0.5, n: [2, 3], max: 3, group: true }, // rotvätte
    'Ő': { home: 'courtyard', near: ['dungeon'], d: 1, p: 0.55, n: [1, 3], max: 4 }, // armborstskytt (helst vid skydd)
    'ő': { home: 'swamp', near: ['forest'], d: 2, p: 0.5, n: [1, 2], max: 2 }, // paddjätte (helst nära vatten)
  };
  const FOES10_CH = Object.keys(FOES10).join(''), NEAR10_P = 0.08, ALTAR10_P = 0.12;
  const COVER10 = 'TeHJkquv²µßĖ'; // skydd för armborstskyttarna (utöver fristående pelare)
  // Körs allra sist i content med egna slumpflöden (forks av content-slumpens 'v10'): allt från version 9 ligger kvar. De nya fienderna byts
  // in mot redan utplacerade fiender i stridsrummen (samma ruta i samma grupp) och legendaltaret läggs på golvet, allt med en ångra-lista
  // (opts.v10.undo, tecknet som stod där förut): underkänns banan tas de bort igen och banan blir exakt som i version 9 (se build7).
  function content10(G, depth, opts, L, H) {
    const { W, g, lock } = G, { rooms, fight, cnt, place } = H, b = L.biome;
    const fk = tag => H.rng.fork(tag);
    if (opts.v10) { opts.v10.added = false; opts.v10.undo = []; }
    const undo = opts.v10 ? opts.v10.undo : [];
    let added = false;
    const swap = (x, y, ch) => { const o = g[y][x]; undo.push([x, y, o]); cnt[o]--; g[y][x] = ch; cnt[ch] = (cnt[ch] || 0) + 1; added = true; };
    const wetAt = (x, y) => { const c = G.at(x, y); return c === '-' || isWet(c); };
    const pillar = (x, y) => G.inb(x, y) && isWall(g[y][x]) && RX.filter((dx, k) => !isWall(G.at(x + dx, y + RY[k]))).length >= 5;
    const coverAt = (x, y) => COVER10.includes(G.at(x, y)) || pillar(x, y);
    const nearBy = (x, y, rad, f) => { for (let yy = y - rad; yy <= y + rad; yy++) for (let xx = x - rad; xx <= x + rad; xx++) if ((xx !== x || yy !== y) && f(xx, yy)) return true; return false; };
    const host = fight.filter(r => r.arch !== 'nest'); // (spindelboet behåller sina spindlar)

    // ----- nya fiender: infödda i sin biom, sällsynta i en närliggande -----
    for (const ch of FOES10_CH) {
      const F = FOES10[ch], R = fk('foe-' + ch), home = b === F.home;
      if (depth < F.d || (!home && !F.near.includes(b))) continue;
      if (!R.chance(home ? F.p : NEAR10_P)) continue;
      let want = Math.min(F.max, home ? R.int(F.n[0], F.n[1]) : F.n[0]);
      const ok = (x, y) => FOE_FROM.includes(g[y][x]) && (ch !== 'ō' || ![0, 1, 2, 3].some(d => wetAt(x + DX[d], y + DY[d])));
      // rumsordning (slump; armborstskyttar helst i rum med skydd, paddjättar helst i rum med vatten) och rutornas ordning i rummet
      const pref = ch === 'Ő' ? (x, y) => nearBy(x, y, 1, coverAt) : ch === 'ő' ? (x, y) => nearBy(x, y, 2, wetAt) : null;
      let order = R.shuffle(host.slice());
      if (pref) {
        const score = new Map(order.map(r => [r, r.cells.some(([x, y]) => (ch === 'Ő' ? coverAt(x, y) || nearBy(x, y, 1, pillar) : wetAt(x, y))) ? 0 : 1]));
        order = order.sort((p, q) => score.get(p) - score.get(q));
      }
      const cands = r => {
        const c = R.shuffle(r.cells.filter(([x, y]) => ok(x, y)));
        return pref ? c.map(p => [p, pref(p[0], p[1]) ? 0 : 1]).sort((p, q) => p[1] - q[1]).map(p => p[0]) : c;
      };
      if (F.group) { // en hel grupp i ett rum (2-3 av gruppens fiender)
        for (const r of order) {
          const c = cands(r);
          if (c.length < 2) continue;
          for (const [x, y] of c.slice(0, Math.max(2, want))) swap(x, y, ch);
          break;
        }
        continue;
      }
      for (let pass = 0; pass < 2 && want > 0; pass++) for (const r of order) { // en per rum först, sedan tätare
        if (want <= 0) break;
        const c = cands(r);
        if (!c.length) continue;
        swap(c[0][0], c[0][1], ch); want--;
      }
    }

    // ----- legendaltaret Œ (~12 % på djup 2+): i ett lugnt rum (helgedomen, skattrummet, specialrum utom utmaningen; annars startrummet) -----
    {
      const R = fk('legendaltar');
      if (depth >= 2 && R.chance(ALTAR10_P)) {
        const front = (x, y) => [0, 1, 2, 3].some(k => isWall(g[y + DY[k]][x + DX[k]]) && g[y - DY[k]][x - DX[k]] === '.' && lock[(y - DY[k]) * W + x - DX[k]] < 2);
        const freeSide = (x, y) => [0, 1, 2, 3].some(d => g[y + DY[d]][x + DX[d]] === '.' && lock[(y + DY[d]) * W + x + DX[d]] < 2);
        // ett nytt hinder får inte stänga in en kruka, spikfälla, lavaruta o.d.: de behåller en fri granne (vatten: en fri granne eller mer vatten)
        const safe = (x, y) => [0, 1, 2, 3].every(d => {
          const nx = x + DX[d], ny = y + DY[d], c = g[ny][nx];
          if (!genBlk(c) || isBlock(c)) return true;
          const wet = isWet(c);
          return [0, 1, 2, 3].some(e => { const mx = nx + DX[e], my = ny + DY[e]; if (mx === x && my === y) return false; const m = G.at(mx, my); return !genBlk(m) || (wet && isWet(m)); });
        });
        const calm = r => r.type === 'shrine' || r.type === 'treasure' || (r.type === 'special' && r.special !== 'challenge' && r.arch !== 'challenge');
        const hosts = R.shuffle(rooms.filter(calm)).concat(rooms.filter(r => r.type === 'start'));
        for (const r of hosts) {
          const p = place(r, 'Œ', 1, { wall: true, center: true, jit: 2, pred: (x, y) => front(x, y) && safe(x, y), rng: R })[0]
            || place(r, 'Œ', 1, { center: true, pred: (x, y) => freeSide(x, y) && safe(x, y), rng: R })[0];
          if (p) { undo.push([p[0], p[1], '.']); added = true; break; }
        }
      }
    }
    if (added && opts.v10) opts.v10.added = true;
    return true;
  }

  // ---------- Version 11: svampriket, spegelpalatset och sporsäckar ----------
  // Körs allra sist i content med egna slumpflöden (forks av content-slumpens 'v11'): allt från version 10 ligger kvar. Svamprikets och
  // spegelpalatsets egna saker läggs alltid (opts.v11.keep); sporsäckarna Ũ i alla biomer läggs med en ångra-lista (opts.v11.undo):
  // underkänns banan tas de bort igen och banan blir exakt som i version 10 (se build7). Lägger teleporterparen i G.teleports
  // ([{ a: { x, y }, b: { x, y } }]).
  const SPORESACK11_CAP = 2, SPOREPOOL11_CAP = 24, MIRROR11 = [0.2, 0.35]; // tak för sporsäckar och sporpölsrutor; spegelväggarnas andel av salarnas väggar
  const SPORESACK11_P = 0.25;
  // rumsväggarna (ringen runt rummets ruta utan hörnen) i salarna där spegelväggar får sitta: [[x, y, sida], ...]; delas med validate/test
  const mirrorRing = (r, at) => {
    const out = [], { x, y, w, h } = r;
    for (let k = 0; k < w; k++) { out.push([x + k, y - 1, 3]); out.push([x + k, y + h, 1]); }
    for (let k = 0; k < h; k++) { out.push([x - 1, y + k, 2]); out.push([x + w, y + k, 0]); }
    return out.filter(([xx, yy]) => { const c = at(xx, yy); return c === 'Š' || c === 'š'; });
  };
  const mirrorHall = r => r.type !== 'guardian' && r.type !== 'secret' && r.type !== 'vault';
  function content11(G, depth, opts, L, H) {
    const { W, g, lock } = G, { rooms, fight, P, X, cnt, set, place, trapOK, rid, size } = H, b = L.biome;
    const fk = tag => H.rng.fork(tag);
    const fungus = b === 'fungus', mirror = b === 'mirror';
    G.teleports = [];
    if (opts.v11) { opts.v11.added = false; opts.v11.undo = []; if (fungus || mirror) opts.v11.keep = true; }
    const undo = opts.v11 ? opts.v11.undo : [];
    const bump = (ch, n) => { cnt[ch] = (cnt[ch] || 0) + n; };
    // ett nytt hinder (eller en ruta som aldrig får vara enda vägen) får inte stänga in en kruka, spikfälla, lavaruta o.d.
    const safe11 = (x, y) => [0, 1, 2, 3].every(d => {
      const nx = x + DX[d], ny = y + DY[d], c = g[ny][nx];
      if (!genBlk(c) || isBlock(c)) return true;
      const wet = isWet(c);
      return [0, 1, 2, 3].some(e => { const mx = nx + DX[e], my = ny + DY[e]; if (mx === x && my === y) return false; const m = G.at(mx, my); return !genBlk(m) || (wet && isWet(m)); });
    });
    const gRoom = rooms.find(r => r.type === 'guardian'), inG = (x, y) => !!gRoom && rid[y * W + x] === gRoom.id;
    const doorNear = (x, y) => RX.some((dx, k) => isDoorCh(G.at(x + dx, y + RY[k]))); // dörr, grind, hemlig/sprucken vägg i de åtta grannarna
    // ingen ny fara intill en annan fara (utom den egna fläckens rutor)
    const HZ11 = SINK11 + '_z¬¯°<>±¨¹' + WET8 + SINK9 + 'Ńń';
    const touch = (x, y, own) => RX.some((dx, k) => { const xx = x + dx, yy = y + RY[k]; return HZ11.includes(G.at(xx, yy)) && !own.some(p => p[0] === xx && p[1] === yy); });
    const hidden = [];
    for (let y = 1; y < G.H - 1; y++) for (let x = 1; x < W - 1; x++) if (g[y][x] === '*' || g[y][x] === '{') hidden.push([x, y]);
    const nearHidden = (x, y) => hidden.some(([hx, hy]) => cheb(hx, hy, x, y) <= 2);
    const swapIn = (x, y, ch) => { cnt[g[y][x]]--; g[y][x] = ch; bump(ch, 1); };

    // ----- svampriket: glödande svamphattar i väggarna, glödsvampar, studsplattor, sporpölar, sporlingar och mycelbestar -----
    if (fungus) {
      // svamphattar Ş: glesa sträckor (1-3 rutor) i de synliga svampväggarna, aldrig vid den hemliga/spruckna väggen
      {
        const R = fk('caps');
        const face = (x, y) => x >= 0 && y >= 0 && x < W && y < G.H && g[y][x] === 'ŝ' && !nearHidden(x, y) && [0, 1, 2, 3].some(d => !isWall(G.at(x + DX[d], y + DY[d])));
        for (let y = 0; y < G.H; y++) for (let x = 0; x < W; x++) {
          if (!face(x, y) || !R.chance(0.045)) continue;
          g[y][x] = 'Ş';
          let cx = x, cy = y;
          for (let k = R.int(0, 2); k > 0; k--) {
            const nb = [0, 1, 2, 3].map(d => [cx + DX[d], cy + DY[d]]).filter(([nx, ny]) => face(nx, ny));
            if (!nb.length) break;
            [cx, cy] = R.pick(nb); g[cy][cx] = 'Ş';
          }
        }
      }
      // glödsvampar Ŧ i stället för eldfaten och lysande svamp F i stället för kandelabrarna (utom i vaktarens sal)
      for (let y = 1; y < G.H - 1; y++) for (let x = 1; x < W - 1; x++) {
        const c = g[y][x];
        if ((c !== 'f' && c !== 'c') || inG(x, y)) continue;
        const to = c === 'f' ? 'Ŧ' : 'F';
        g[y][x] = to; cnt[c]--; bump(to, 1);
      }
      // studsplattor ţ (1-4): i stridsrummen och skattrummen (annars startrummet), på öppet golv, aldrig vid dörrar, P eller x,
      // aldrig enda vägen (localOK: med plattan som hinder hänger allt ihop)
      {
        const R = fk('bounce'), want = R.int(1, 4);
        const okB = (x, y) => trapOK(x, y) && !doorNear(x, y) && !inG(x, y) && safe11(x, y) && !touch(x, y, []);
        const host = R.shuffle(rooms.filter(r => (H.isCombat(r) || r.type === 'treasure') && size(r) >= 12));
        const more = rooms.filter(r => r.type === 'start' || r.type === 'shrine' || (r.type === 'special' && size(r) >= 12));
        let n = 0;
        for (let pass = 0; pass < 3 && n < want; pass++) for (const r of pass < 2 ? host : more) {
          if (n >= want) break;
          if (pass === 0 && r.cells.some(([x, y]) => g[y][x] === 'ţ')) continue; // först en per rum
          n += place(r, 'ţ', 1, { open: pass < 2, center: pass === 0, jit: 3, spread: 4, avoid: ['ţ', 3], pred: okB, rng: R }).length;
        }
        if (!n) return null;
      }
      // sporpölar Ť: 2-4 fläckar om 2-6 rutor i strids- och skattrummen och ibland i breda korridorer; aldrig vid dörrar, P eller x,
      // aldrig enda vägen (varje ruta läggs med localOK)
      {
        const R = fk('spores'), okS = own => (x, y) => trapOK(x, y) && !doorNear(x, y) && !inG(x, y) && localOK(G, x, y) && safe11(x, y) && !touch(x, y, own);
        const hosts = R.shuffle(rooms.filter(r => H.isCombat(r) || r.type === 'treasure'));
        let patches = R.int(2, 4);
        for (const r of hosts) {
          if (patches <= 0) break;
          const s = R.shuffle(r.cells.filter(([x, y]) => okS([])(x, y)))[0];
          if (!s) continue;
          const want = R.int(2, 6), done = [], fr = [s], seen = new Set([s[1] * W + s[0]]);
          while (fr.length && done.length < want && (cnt['Ť'] || 0) < SPOREPOOL11_CAP) {
            const [x, y] = fr.splice(R.int(0, fr.length - 1), 1)[0];
            if (!okS(done)(x, y)) continue;
            set(x, y, 'Ť'); done.push([x, y]);
            for (let d = 0; d < 4; d++) { const nx = x + DX[d], ny = y + DY[d], ni = ny * W + nx; if (!seen.has(ni) && rid[ni] === r.id) { seen.add(ni); fr.push([nx, ny]); } }
          }
          if (done.length === 1) { const [x, y] = done[0]; g[y][x] = '.'; cnt['Ť']--; } else if (done.length) patches--;
        }
      }
      // sporlingar ŗ: en hel grupp (3-5) i ett stridsrum (~85 %, djup 3+ ibland två grupper); byts in mot gruppens fiender
      {
        const R = fk('sporelings'), mob = FOE_FROM + 'ř';
        let groups = R.chance(0.85) ? (depth >= 3 && R.chance(0.35) ? 2 : 1) : 0;
        for (const r of R.shuffle(fight.filter(r => r.arch !== 'nest'))) {
          if (groups <= 0) break;
          const c = R.shuffle(r.cells.filter(([x, y]) => mob.includes(g[y][x])));
          if (c.length < 3) continue;
          for (const [x, y] of c.slice(0, R.int(3, 5))) swapIn(x, y, 'ŗ');
          groups--;
        }
      }
      // mycelbestar Ř (djup 2+, ~55 %, 1-2, högst 2): byts in i stora stridsrum (minst 30 rutor)
      {
        const R = fk('brutes'), mob = FOE_FROM + 'ř';
        let n = depth >= 2 && R.chance(0.55) ? (R.chance(0.35) ? 2 : 1) : 0;
        const open = r => r.cells.reduce((k, [x, y]) => k + (isWall(g[y][x]) ? 0 : 1), 0); // rutor som inte blivit vägg (svampstjälkar o.d.)
        for (const r of R.shuffle(fight.filter(r => open(r) >= 30 && r.arch !== 'nest'))) {
          if (n <= 0) break;
          const c = r.cells.filter(([x, y]) => mob.includes(g[y][x]));
          if (!c.length) continue;
          const [x, y] = R.pick(c); swapIn(x, y, 'Ř'); n--;
        }
      }
    }

    // ----- spegelpalatset: spegelväggar, spegelstatyer, teleporterpar, illusionister och glasskärvor -----
    if (mirror) {
      // spegelväggar š: hela väggsegment (rak sträcka längs en sida av salen, minst 2 rutor, avbrutna vid dörrkarmarna) tills ~20-35 % av
      // salarnas väggar är speglar; aldrig på en dörrkarm (ingen dörr/grind/hemlig vägg bland de åtta grannarna) och aldrig vid den hemliga väggen
      {
        const R = fk('mirrors'), at = (x, y) => G.at(x, y), segs = [];
        let tot = 0;
        for (const r of rooms.filter(mirrorHall)) {
          const ring = mirrorRing(r.box, at);
          tot += ring.length;
          for (let side = 0; side < 4; side++) {
            let run = [];
            const flush = () => { if (run.length >= 2) segs.push(run); run = []; };
            for (const p of ring.filter(q => q[2] === side)) {
              const [x, y] = p, prev = run[run.length - 1];
              if (prev && cheb(prev[0], prev[1], x, y) !== 1) flush();
              const ix = x - DX[side], iy = y - DY[side]; // rutan innanför (salens sida)
              if (doorNear(x, y) || nearHidden(x, y) || isWall(G.at(ix, iy))) { flush(); continue; }
              run.push(p);
            }
            flush();
          }
        }
        const target = R.range(0.24, 0.31) * tot, cap = MIRROR11[1] * tot;
        let n = 0;
        for (const seg of R.shuffle(segs)) {
          if (n >= target) break;
          if (n + seg.length > cap) continue;
          for (const [x, y] of seg) g[y][x] = 'š';
          n += seg.length;
        }
        if (!tot || n < MIRROR11[0] * tot) return null;
      }
      // spegelstatyer ŧ (1-3 till utöver salarnas): mot en vägg i salarna, aldrig nära P
      {
        const R = fk('statues'), want = R.int(1, 3);
        const host = R.shuffle(rooms.filter(r => !['guardian', 'vault', 'secret', 'shop'].includes(r.type)));
        let n = 0;
        for (const r of host) { if (n >= want) break; n += place(r, 'ŧ', 1, { wall: true, avoid: ['ŧ', 2], pred: (x, y) => safe11(x, y) && cheb(x, y, P[0], P[1]) >= 2, rng: R }).length; }
      }
      // teleporterpar ť (1-3): varje par i två olika rum (ett rum har högst en teleporter), helst långt ifrån varandra; aldrig vid
      // dörrar, P eller x, aldrig enda vägen (localOK: allt nås till fots med teleportrarna som hinder)
      {
        const R = fk('teleports'), want = R.int(1, 3);
        const okT = (x, y) => trapOK(x, y) && !doorNear(x, y) && !inG(x, y) && cheb(x, y, P[0], P[1]) >= 2 && cheb(x, y, X[0], X[1]) >= 2
          && safe11(x, y) && !touch(x, y, []) && [0, 1, 2, 3].filter(d => !genBlk(g[y + DY[d]][x + DX[d]])).length >= 2;
        const host = R.shuffle(rooms.filter(r => ['normal', 'elite', 'exit', 'treasure', 'start', 'shrine', 'special'].includes(r.type) && size(r) >= 9));
        const used = new Set();
        for (let k = 0; k < want; k++) {
          const free = host.filter(r => !used.has(r.id));
          let done = false;
          for (const ra of free) {
            const order = free.filter(r => r !== ra).sort((p, q) => Math.hypot(q.cx - ra.cx, q.cy - ra.cy) - Math.hypot(p.cx - ra.cx, p.cy - ra.cy));
            const a = place(ra, 'ť', 1, { center: true, jit: 2.5, pred: okT, rng: R })[0];
            if (!a) continue;
            for (const rb of order.slice(0, 4)) {
              const bb = place(rb, 'ť', 1, { center: true, jit: 2.5, pred: okT, rng: R })[0];
              if (!bb) continue;
              G.teleports.push({ a: { x: a[0], y: a[1] }, b: { x: bb[0], y: bb[1] } });
              used.add(ra.id); used.add(rb.id); done = true; break;
            }
            if (done) break;
            g[a[1]][a[0]] = '.'; cnt['ť']--;
          }
          if (!done) break;
        }
        if (!G.teleports.length) return null;
      }
      // illusionister ś (djup 2+, ~55 %, 1-2, högst 2): byts in mot redan utplacerade fiender i stridsrummen
      {
        const R = fk('illusionists'), mob = FOE_FROM + 'Ś';
        let n = depth >= 2 && R.chance(0.55) ? (R.chance(0.35) ? 2 : 1) : 0;
        for (const r of R.shuffle(fight.filter(r => r.arch !== 'nest'))) {
          if (n <= 0) break;
          const c = r.cells.filter(([x, y]) => mob.includes(g[y][x]));
          if (!c.length) continue;
          const [x, y] = R.pick(c); swapIn(x, y, 'ś'); n--;
        }
      }
      // glasskärvor Ŝ: en hel grupp (2-4) i ett stridsrum (~75 %, djup 3+ ibland två grupper)
      {
        const R = fk('shards'), mob = FOE_FROM + 'Ś';
        let groups = R.chance(0.75) ? (depth >= 3 && R.chance(0.3) ? 2 : 1) : 0;
        for (const r of R.shuffle(fight.filter(r => r.arch !== 'nest' && !r.cells.some(([x, y]) => g[y][x] === 'ś')))) {
          if (groups <= 0) break;
          const c = R.shuffle(r.cells.filter(([x, y]) => mob.includes(g[y][x])));
          if (c.length < 2) continue;
          for (const [x, y] of c.slice(0, R.int(2, 4))) swapIn(x, y, 'Ŝ');
          groups--;
        }
      }
    }

    // ----- alla biomer: sporsäckar Ũ (~25 %, svampriket ~45 %, 1-2, högst 2; helst i hemliga rum, valv och skattrum) -----
    {
      let added = false;
      const R = fk('sporesacks'), loot = rooms.filter(r => r.type !== 'guardian' && r.type !== 'shop' && r.type !== 'start');
      const n = R.chance(fungus ? 0.45 : SPORESACK11_P) ? R.int(1, 2) : 0;
      for (let k = 0; k < n; k++) for (let t = 0; t < 6; t++) {
        const r = R.weighted(loot, q => (q.type === 'secret' ? 3 : q.type === 'vault' || q.type === 'treasure' ? 2 : 1)), p = r && place(r, 'Ũ', 1, { rng: R })[0];
        if (p) { undo.push([p[0], p[1], '.']); added = true; break; }
      }
      if (added && opts.v11) opts.v11.added = true;
    }
    return true;
  }

  // ---------- Version 13: biblioteket, gjuteriet och bläckflaskor ----------
  // Körs allra sist i content med egna slumpflöden (forks av content-slumpens 'v13'): allt från version 11 ligger kvar. Bibliotekets och
  // gjuteriets egna saker läggs alltid (opts.v13.keep); bläckflaskorna Ƃ i alla biomer läggs med en ångra-lista (opts.v13.undo): underkänns
  // banan tas de bort igen och banan blir exakt som i version 11 (se build7). Lägger rullbanden i G.belts ([{ x, y, dx, dy }], en post per Ÿ).
  const INKFLASK13_P = 0.2, INKFLASK13_LIB_P = 0.4, INKFLASK13_CAP = 2, INK13_CAP = 24, LECTERN13_CAP = 3, VENT13_CAP = 5, PRESS13_CAP = 4;
  const BELT13_LEN = [4, 9], BELT13_MAX = 4;
  function content13(G, depth, opts, L, H) {
    const { W, g, lock } = G, { rooms, fight, P, X, cnt, set, place, trapOK, rid, size } = H, b = L.biome;
    const fk = tag => H.rng.fork(tag);
    const lib = b === 'library', fou = b === 'foundry';
    G.belts = [];
    if (opts.v13) { opts.v13.added = false; opts.v13.undo = []; if (lib || fou) opts.v13.keep = true; }
    const undo = opts.v13 ? opts.v13.undo : [];
    const bump = (ch, n) => { cnt[ch] = (cnt[ch] || 0) + n; };
    // ett nytt hinder (eller en ruta som aldrig får vara enda vägen) får inte stänga in en kruka, spikfälla, lavaruta o.d.
    const safe13 = (x, y) => [0, 1, 2, 3].every(d => {
      const nx = x + DX[d], ny = y + DY[d], c = g[ny][nx];
      if (!genBlk(c) || isBlock(c)) return true;
      const wet = isWet(c);
      return [0, 1, 2, 3].some(e => { const mx = nx + DX[e], my = ny + DY[e]; if (mx === x && my === y) return false; const m = G.at(mx, my); return !genBlk(m) || (wet && isWet(m)); });
    });
    const gRoom = rooms.find(r => r.type === 'guardian'), inG = (x, y) => !!gRoom && rid[y * W + x] === gRoom.id;
    const doorNear = (x, y) => RX.some((dx, k) => isDoorCh(G.at(x + dx, y + RY[k]))); // dörr, grind, hemlig/sprucken vägg i de åtta grannarna
    const nearPX2 = (x, y) => cheb(x, y, P[0], P[1]) <= 1 || cheb(x, y, X[0], X[1]) <= 1;
    // ingen ny fara intill en annan fara (utom den egna fläckens rutor)
    const HZ13 = SINK13 + BELT13 + SINK11 + '_z¬¯°<>±¨¹' + WET8 + SINK9 + 'Ńń';
    const touch = (x, y, own) => RX.some((dx, k) => { const xx = x + dx, yy = y + RY[k]; return HZ13.includes(G.at(xx, yy)) && !own.some(p => p[0] === xx && p[1] === yy); });
    const hidden = [];
    for (let y = 1; y < G.H - 1; y++) for (let x = 1; x < W - 1; x++) if (g[y][x] === '*' || g[y][x] === '{') hidden.push([x, y]);
    const nearHidden = (x, y) => hidden.some(([hx, hy]) => cheb(hx, hy, x, y) <= 2);
    const swapIn = (x, y, ch) => { cnt[g[y][x]]--; g[y][x] = ch; bump(ch, 1); };
    const face = (x, y, wc) => x >= 0 && y >= 0 && x < W && y < G.H && g[y][x] === wc && !nearHidden(x, y) && [0, 1, 2, 3].some(d => !isWall(G.at(x + DX[d], y + DY[d])));
    const nOpen = r => r.cells.reduce((k, [x, y]) => k + (isWall(g[y][x]) ? 0 : 1), 0); // rutor som inte blivit vägg (hyllrader o.d.)
    // fläckar (bläckpölar): 2-4 fläckar om 2-6 rutor i strids- och skattrummen; aldrig vid dörrar, P eller x, aldrig enda vägen (localOK)
    const patches = (R, ch, cap, nP) => {
      const okS = own => (x, y) => trapOK(x, y) && !doorNear(x, y) && !inG(x, y) && localOK(G, x, y) && safe13(x, y) && !touch(x, y, own);
      const hosts = R.shuffle(rooms.filter(r => H.isCombat(r) || r.type === 'treasure'));
      let left = nP, tot = 0;
      for (const r of hosts) {
        if (left <= 0) break;
        const s = R.shuffle(r.cells.filter(([x, y]) => okS([])(x, y)))[0];
        if (!s) continue;
        const want = R.int(2, 6), done = [], fr = [s], seen = new Set([s[1] * W + s[0]]);
        while (fr.length && done.length < want && (cnt[ch] || 0) < cap) {
          const [x, y] = fr.splice(R.int(0, fr.length - 1), 1)[0];
          if (!okS(done)(x, y)) continue;
          set(x, y, ch); done.push([x, y]);
          for (let d = 0; d < 4; d++) { const nx = x + DX[d], ny = y + DY[d], ni = ny * W + nx; if (!seen.has(ni) && rid[ni] === r.id) { seen.add(ni); fr.push([nx, ny]); } }
        }
        if (done.length === 1) { const [x, y] = done[0]; g[y][x] = '.'; cnt[ch]--; } else if (done.length) { left--; tot += done.length; }
      }
      return tot;
    };
    // en hel grupp av ch (lo-hi) i ett stridsrum, byts in mot gruppens fiender; groups grupper
    const groupIn = (R, ch, mob, groups, lo, hi, minC) => {
      for (const r of R.shuffle(fight.filter(r => r.arch !== 'nest'))) {
        if (groups <= 0) break;
        const c = R.shuffle(r.cells.filter(([x, y]) => mob.includes(g[y][x])));
        if (c.length < minC) continue;
        for (const [x, y] of c.slice(0, R.int(lo, hi))) swapIn(x, y, ch);
        groups--;
      }
    };
    // enstaka fiender ch (n st) inbytta i stridsrummen (big: bara rum med minst 30 gångbara rutor)
    const singlesIn = (R, ch, mob, n, big) => {
      for (const r of R.shuffle(fight.filter(r => r.arch !== 'nest' && (!big || nOpen(r) >= 30)))) {
        if (n <= 0) break;
        const c = r.cells.filter(([x, y]) => mob.includes(g[y][x]));
        if (!c.length) continue;
        const [x, y] = R.pick(c); swapIn(x, y, ch); n--;
      }
    };

    // ----- biblioteket: bokhyllor i väggarna, ljuskronor, pulpeter, bläckpölar, flygande böcker och arkivariespöken -----
    if (lib) {
      // bokhyllor ũ: sträckor om 1-4 rutor i de synliga panelväggarna (Ū), aldrig vid den hemliga/spruckna väggen
      {
        const R = fk('shelfwalls');
        for (let y = 0; y < G.H; y++) for (let x = 0; x < W; x++) {
          if (!face(x, y, 'Ū') || !R.chance(0.06)) continue;
          g[y][x] = 'ũ';
          let cx = x, cy = y;
          for (let k = R.int(0, 3); k > 0; k--) {
            const nb = [0, 1, 2, 3].map(d => [cx + DX[d], cy + DY[d]]).filter(([nx, ny]) => face(nx, ny, 'Ū'));
            if (!nb.length) break;
            [cx, cy] = R.pick(nb); g[cy][cx] = 'ũ';
          }
        }
      }
      // ljuskronor ű i stället för eldfaten (utom i vaktarens sal): ljus som inte blockerar
      // (bara där eldfatet har en gångbar granne utan fara: rutan blir gångbar och ska nås)
      const walk = c => !isBlock(c) && !'_z¬¯'.includes(c) && !isWet(c) && !SINK9.includes(c) && !SINK11.includes(c) && !SINK13.includes(c);
      for (let y = 1; y < G.H - 1; y++) for (let x = 1; x < W - 1; x++) if (g[y][x] === 'f' && !inG(x, y) && [0, 1, 2, 3].some(d => walk(g[y + DY[d]][x + DX[d]]))) { g[y][x] = 'ű'; cnt.f--; bump('ű', 1); }
      // pulpeter Ű (1-3): mot en vägg med fri framsida (eller med en fri sida), helst i läsesalar och skrivarsalar, högst en per rum;
      // aldrig i vaktarens sal, valv eller hemliga rum (nås alltid med grindarna stängda)
      {
        const R = fk('lecterns'), want = R.int(1, LECTERN13_CAP);
        const front = (x, y) => [0, 1, 2, 3].some(k => isWall(g[y + DY[k]][x + DX[k]]) && g[y - DY[k]][x - DX[k]] === '.' && lock[(y - DY[k]) * W + x - DX[k]] < 2);
        const freeSide = (x, y) => [0, 1, 2, 3].some(d => g[y + DY[d]][x + DX[d]] === '.' && lock[(y + DY[d]) * W + x + DX[d]] < 2);
        const pri = r => (r.arch === 'readingroom' || r.arch === 'scriptorium' ? 0 : ['stacks', 'library', 'archive'].includes(r.arch) ? 1 : 2);
        const host = R.shuffle(rooms.filter(r => !['guardian', 'vault', 'secret'].includes(r.type))).sort((p, q) => pri(p) - pri(q));
        let n = 0;
        for (const r of host) {
          if (n >= want) break;
          const ok = (x, y) => safe13(x, y) && cheb(x, y, P[0], P[1]) >= 2;
          const p = place(r, 'Ű', 1, { wall: true, center: true, jit: 2, pred: (x, y) => front(x, y) && ok(x, y), rng: R })[0]
            || place(r, 'Ű', 1, { pred: (x, y) => freeSide(x, y) && ok(x, y), rng: R })[0];
          if (p) n++;
        }
        if (!n) return null;
      }
      // bläckpölar Ŭ: 2-4 fläckar om 2-6 rutor (högst 24 rutor)
      { const R = fk('ink'); patches(R, 'Ŭ', INK13_CAP, R.int(2, 4)); }
      // flygande böcker Ų: en hel grupp (3-5) i ett stridsrum (~85 %, djup 3+ ibland två grupper)
      { const R = fk('grimoires'); groupIn(R, 'Ų', FOE_FROM + 'ų', R.chance(0.85) ? (depth >= 3 && R.chance(0.35) ? 2 : 1) : 0, 3, 5, 3); }
      // arkivariespöken Ŵ (djup 2+, ~55 %, 1-2, högst 2): byts in mot redan utplacerade fiender i stridsrummen
      { const R = fk('archivists'); singlesIn(R, 'Ŵ', FOE_FROM + 'ų', depth >= 2 && R.chance(0.55) ? (R.chance(0.35) ? 2 : 1) : 0, false); }
    }

    // ----- gjuteriet: smältugnar, kanaler med smält metall, stansar, städ, ångventiler, rullband, smältgolemer och gnistdrönare -----
    if (fou) {
      // smältugnar Ŷ: glesa enstaka rutor i de synliga plåtväggarna (ŵ), aldrig vid den hemliga/spruckna väggen, minst 3 rutor isär
      {
        const R = fk('furnaces'), got = [];
        for (let y = 0; y < G.H; y++) for (let x = 0; x < W; x++) {
          if (!face(x, y, 'ŵ') || !R.chance(0.05) || got.some(p => cheb(p[0], p[1], x, y) < 3)) continue;
          g[y][x] = 'Ŷ'; got.push([x, y]);
        }
      }
      // kanaler med smält metall Ź (gjuthallarna och ibland smältverken, F.canal): saknas de läggs en rak kanal (1-2 bred) tvärs över en stor sal
      // med en spång (1-2 rutor) där man går över; varje ruta med localOK (aldrig enda vägen), aldrig vid dörrar, P eller x, aldrig intill en fara
      if (!cnt['Ź']) { // (gjuthallarna och smältverken har oftast redan fått sina kanaler)
        const R = fk('canals'), want = 1;
        const host = R.shuffle(rooms.filter(r => (H.isCombat(r) || r.type === 'treasure') && r.box.w >= 5 && r.box.h >= 5 && !inG(r.cx, r.cy)))
          .sort((p, q) => (q.arch === 'casting' ? 1 : 0) - (p.arch === 'casting' ? 1 : 0));
        let n = 0;
        for (const r of host) for (let t = 0; t < 4; t++) {
          if (n >= want) break;
          const bx = r.box, vert = R.chance(0.5), A = vert ? bx.h : bx.w, B = vert ? bx.w : bx.h;
          const wide = B >= 7 && R.chance(0.5) ? 2 : 1, o = R.int(1, B - 1 - wide), br = R.int(1, A - 3), bw = R.int(1, 2), cells = [];
          for (let a = 0; a < A; a++) {
            if (a >= br && a < br + bw) continue; // spången
            for (let t = 0; t < wide; t++) {
              const x = vert ? bx.x + o + t : bx.x + a, y = vert ? bx.y + a : bx.y + o + t, i = y * W + x;
              if (!G.inb(x, y) || rid[i] !== r.id || !trapOK(x, y) || doorNear(x, y) || !localOK(G, x, y) || !safe13(x, y) || touch(x, y, cells)) continue;
              g[y][x] = 'Ź'; cells.push([x, y]);
            }
          }
          const kept = cells.filter(([x, y]) => cells.some(p => Math.abs(p[0] - x) + Math.abs(p[1] - y) === 1)); // utan lösa rutor
          for (const [x, y] of cells) if (!kept.some(p => p[0] === x && p[1] === y)) g[y][x] = '.';
          if (kept.length < 3) { for (const [x, y] of kept) g[y][x] = '.'; continue; }
          bump('Ź', kept.length); n++;
        }
      }
      // stansar Ż (1-4, ett block): först i korridorerna där det finns plats runt om (localOK: aldrig enda vägen), annars i salarna;
      // aldrig vid dörrar, P eller x, minst 4 rutor isär
      {
        const R = fk('presses'), want = R.int(1, PRESS13_CAP), got = [];
        const okP = (x, y) => g[y][x] === '.' && !lock[y * W + x] && !doorNear(x, y) && !inG(x, y) && cheb(x, y, P[0], P[1]) >= 2 && cheb(x, y, X[0], X[1]) >= 2
          && got.every(p => cheb(p[0], p[1], x, y) >= 4) && localOK(G, x, y) && safe13(x, y);
        for (const [x, y] of R.shuffle((H.corridors || []).slice())) { if (got.length >= Math.min(want, 2)) break; if (okP(x, y)) { set(x, y, 'Ż'); got.push([x, y]); } }
        const pri = r => (r.arch === 'pressroom' ? 0 : H.isCombat(r) ? 1 : 2);
        const host = R.shuffle(rooms.filter(r => !['guardian', 'vault', 'secret', 'start', 'shop'].includes(r.type))).sort((p, q) => pri(p) - pri(q));
        for (let pass = 0; pass < 2 && got.length < want; pass++) for (const r of host) {
          if (got.length >= want) break;
          const p = place(r, 'Ż', 1, { pred: (x, y) => okP(x, y) && (pass > 0 || !r.cells.some(([cx, cy]) => g[cy][cx] === 'Ż')), rng: R })[0];
          if (p) got.push(p);
        }
        if (!got.length) return null;
      }
      // städ/gjutformar ż: 1-3 till som dekor mot väggarna i salarna
      {
        const R = fk('molds'), want = R.int(1, 3);
        const host = R.shuffle(rooms.filter(r => !['guardian', 'vault', 'secret', 'shop'].includes(r.type)));
        let n = 0;
        for (const r of host) { if (n >= want) break; n += place(r, 'ż', 1, { wall: true, avoid: ['ż', 2], pred: (x, y) => safe13(x, y) && cheb(x, y, P[0], P[1]) >= 2 && !doorNear(x, y), rng: R }).length; }
      }
      // ångventiler ź (2-5): på öppet golv i salarna (och korridorerna), aldrig vid dörrar, P eller x, aldrig enda vägen, minst 3 rutor isär
      {
        const R = fk('vents'), want = R.int(2, VENT13_CAP), got = [];
        const okV = (x, y) => trapOK(x, y) && !doorNear(x, y) && !inG(x, y) && localOK(G, x, y) && safe13(x, y) && !touch(x, y, []) && got.every(p => cheb(p[0], p[1], x, y) >= 3);
        const host = R.shuffle(rooms.filter(r => H.isCombat(r) || r.type === 'treasure'));
        const more = rooms.filter(r => ['start', 'shrine', 'special'].includes(r.type));
        for (let pass = 0; pass < 3 && got.length < want; pass++) for (const r of pass < 2 ? host : more) {
          if (got.length >= want) break;
          if (pass === 0 && r.cells.some(([x, y]) => g[y][x] === 'ź')) continue;
          const p = place(r, 'ź', 1, { open: pass === 0, pred: okV, rng: R })[0];
          if (p) got.push(p);
        }
        for (const [x, y] of R.shuffle((H.corridors || []).slice())) { if (got.length >= want) break; if (okV(x, y)) { set(x, y, 'ź'); got.push([x, y]); } }
        if (got.length < 2) return null;
      }
      // rullband Ÿ (1-4): raka band om 4-9 rutor i salarna (rullbandshallarna först) och korridorerna; samma riktning längs hela bandet, rutan
      // efter bandets slut är fritt golv (aldrig vägg, hinder eller fara), aldrig vid dörrar, P eller x, aldrig intill ett annat band
      {
        const R = fk('belts'), want = R.int(1, BELT13_MAX), on = new Uint8Array(W * G.H);
        let nb = 0;
        // (även på dörrarnas gångar: bandet är golv som går att gå på; hela bandet i samma sal eller i korridorerna, k = rummets id eller -1)
        const okC = (x, y, k) => G.inb(x, y) && g[y][x] === '.' && rid[y * W + x] === k && !doorNear(x, y) && !inG(x, y) && !nearPX2(x, y)
          && !RX.some((dx, k) => on[(y + RY[k]) * W + x + dx]);
        const tryBelt = (x0, y0) => {
          // längsta raka sträckan med fria rutor från (x0, y0) i varje riktning; den längsta prövas först (hellre långa band)
          const k0 = rid[y0 * W + x0];
          const dirs = [0, 1, 2, 3].map(d => { let run = 1; while (run < BELT13_LEN[1] && okC(x0 + DX[d] * run, y0 + DY[d] * run, k0)) run++; return [d, run + R.next() * 0.5]; })
            .sort((a, b) => b[1] - a[1]);
          for (const [d, rr] of dirs) {
            const dx = DX[d], dy = DY[d], run = Math.floor(rr);
            if (run < BELT13_LEN[0]) continue;
            for (let len = R.chance(0.6) ? run : R.int(BELT13_LEN[0], run); len >= BELT13_LEN[0]; len--) {
              const ex = x0 + dx * len, ey = y0 + dy * len, e = G.at(ex, ey);
              if (isBlock(e) || HAZARD.includes(e) || HZ13.includes(e) || isDoorCh(e) || on[ey * W + ex]) continue;
              for (let k = 0; k < len; k++) { const x = x0 + dx * k, y = y0 + dy * k; g[y][x] = 'Ÿ'; on[y * W + x] = 1; G.belts.push({ x, y, dx, dy }); }
              bump('Ÿ', len); G.lockMin(ex, ey, 1); // inget hinder får hamna där bandet slutar
              return true;
            }
          }
          return false;
        };
        // startrutor: i salarna helst intill en vägg (bandet kan gå tvärs över salen), annars var som helst
        const wallSide = (x, y) => [0, 1, 2, 3].some(d => isWall(G.at(x + DX[d], y + DY[d])));
        const pri = r => (r.arch === 'beltworks' ? 0 : 1);
        const host = R.shuffle(rooms.filter(r => (H.isCombat(r) || r.type === 'treasure' || r.type === 'shrine' || r.type === 'special') && Math.max(r.box.w, r.box.h) >= 5))
          .sort((p, q) => pri(p) - pri(q));
        for (const r of host) {
          if (nb >= want) break;
          for (const [x, y] of R.shuffle(r.cells.slice()).sort((p, q) => (wallSide(q[0], q[1]) ? 1 : 0) - (wallSide(p[0], p[1]) ? 1 : 0))) if (okC(x, y, r.id) && tryBelt(x, y)) { nb++; break; }
        }
        if (nb < want) for (const [x, y] of R.shuffle((H.corridors || []).slice())) { if (nb >= want) break; if (okC(x, y, -1) && tryBelt(x, y)) nb++; }
        if (!nb) return null;
      }
      // smältgolemer Ž (djup 2+, ~55 %, 1-2, högst 2): byts in i stora stridsrum (minst 30 gångbara rutor)
      { const R = fk('golems'); singlesIn(R, 'Ž', FOE_FROM + 'ž', depth >= 2 && R.chance(0.55) ? (R.chance(0.35) ? 2 : 1) : 0, true); }
      // gnistdrönare ſ: en hel grupp (2-4) i ett stridsrum (~75 %, djup 3+ ibland två grupper)
      { const R = fk('drones'); groupIn(R, 'ſ', FOE_FROM + 'ž', R.chance(0.75) ? (depth >= 3 && R.chance(0.3) ? 2 : 1) : 0, 2, 4, 2); }
    }

    // ----- alla biomer: bläckflaskor Ƃ (~20 %, biblioteket ~40 %, 1-2, högst 2; helst i hemliga rum, valv och skattrum) -----
    {
      let added = false;
      const R = fk('inkflasks'), loot = rooms.filter(r => r.type !== 'guardian' && r.type !== 'shop' && r.type !== 'start');
      const n = R.chance(lib ? INKFLASK13_LIB_P : INKFLASK13_P) ? R.int(1, INKFLASK13_CAP) : 0;
      for (let k = 0; k < n; k++) for (let t = 0; t < 6; t++) {
        const r = R.weighted(loot, q => (q.type === 'secret' ? 3 : q.type === 'vault' || q.type === 'treasure' ? 2 : 1)), p = r && place(r, 'Ƃ', 1, { rng: R })[0];
        if (p) { undo.push([p[0], p[1], '.']); added = true; break; }
      }
      if (added && opts.v13) opts.v13.added = true;
    }
    return true;
  }

  // ---------- Version 14: arenarum, nya fiender i de mellersta och sena biomerna, nya handgjorda rumstyper ----------
  // FOES14: tecken -> { home: biomen, d: första djup, p: andel banor, n: [min, max] per bana, max: tak (validate) }
  const FOES14 = {
    'Ƅ': { home: 'frost', d: 1, p: 0.6, n: [1, 3], max: 3 }, // snöfantom
    'ƅ': { home: 'volcano', d: 2, p: 0.6, n: [1, 2], max: 2 }, // lavaorm (helst nära lava)
    'Ɔ': { home: 'tomb', d: 2, p: 0.55, n: [1, 2], max: 2 }, // skarabépräst
    'Ƈ': { home: 'crystal', d: 1, p: 0.6, n: [1, 3], max: 3 }, // kristallspindel
    'ƈ': { home: 'sunken', d: 1, p: 0.65, n: [1, 2], max: 3 }, // marulk (bara i/vid djupt vatten Đ eller tidvatten Ĕ)
    'Ɖ': { home: 'sky', d: 2, p: 0.55, n: [1, 2], max: 2 }, // vindande
  };
  const FOES14_CH = Object.keys(FOES14).join('');
  const NATIVE14 = { frost: 'ÉÜ', volcano: 'Æ', tomb: 'ÃÊ', crystal: 'ËÍ', sunken: 'ÏÛÚ', sky: 'Ķķ' }; // biomernas egna (utöver FOE_FROM) som kan bytas
  const WATER14 = 'ĐĔĜÓ'; // marulkens vatten
  const ARENA14_P = 0.6, SET14_P = 0.4;
  // nya handgjorda rumstyper (bara befintliga tecken): id -> { biome, min: minsta antal rutor, fill: mönster }
  //   mönster: rows (två rader var annan ruta längs långsidan, två rutor från väggarna), grid (var annan ruta x var tredje), ring (runt mitten),
  //   wall (var annan ruta längs väggarna), blob (en fläck runt mitten), strip (en strimma tvärs över rummet med en bro om 2 rutor i mitten)
  const SET14 = {
    pillargallery: { biome: 'dungeon', min: 30, fill: [['rows', 'W'], ['wall', 'j', 3]] }, // pelarsal med galleri (pelare i salens väggtecken)
    stalagmites: { biome: 'caves', min: 24, fill: [['grid', 'W'], ['wall', 'F', 2]] }, // droppstensgrotta
    gravevault: { biome: 'graveyard', min: 24, fill: [['grid', 'k'], ['wall', 'n', 3]] }, // gravvalv med kistrader
    stonecircle: { biome: 'forest', min: 24, fill: [['ring', 'u'], ['wall', 'j', 2]] }, // stencirkel
    colonnade: { biome: 'courtyard', min: 30, fill: [['rows', 'u'], ['wall', 'T', 2]] }, // pelargång
    drownedcrypt: { biome: 'swamp', min: 24, fill: [['blob', '-'], ['wall', 'k', 3]] }, // översvämmad krypta
    icehall: { biome: 'frost', min: 24, fill: [['blob', ':'], ['rows', 'u']] }, // isbelagd sal med frusna statyer
    lavabridge: { biome: 'volcano', min: 24, fill: [['strip', '_'], ['rows', 'W'], ['wall', 'j', 2]] }, // bro över lava
    obeliskhall: { biome: 'tomb', min: 24, fill: [['rows', 'u'], ['wall', 'k', 2]] }, // obelisksal med likkistor
    crystalnave: { biome: 'crystal', min: 24, fill: [['ring', 'i'], ['rows', 'W']] }, // kristallkatedral
    drownedgallery: { biome: 'sunken', min: 24, fill: [['grid', 'u'], ['wall', 'k', 2]] }, // sjunket galleri
    assemblyhall: { biome: 'clock', min: 24, fill: [['grid', 'J'], ['wall', 'T', 3]] }, // monteringshall
    windshrine: { biome: 'sky', min: 24, fill: [['ring', 'u']] }, // vindhelgedom
    capgarden: { biome: 'fungus', min: 24, fill: [['grid', 'F'], ['wall', 'j', 3]] }, // svampträdgård
    statuegallery: { biome: 'mirror', min: 24, fill: [['rows', 'u'], ['wall', 'H', 2]] }, // statygalleri
    readingnook: { biome: 'library', min: 24, fill: [['grid', 'J'], ['wall', 'q', 4]] }, // läsesal med bordsrader
    crateyard: { biome: 'foundry', min: 24, fill: [['grid', 'T'], ['wall', 'H', 2]] }, // lagerhall
    // version 15/16: samma mekanism i de nya biomerna (rumstypen läggs av content14, med v14:s ångra-lista)
    cloister: { biome: 'cathedral', min: 30, fill: [['rows', 'W'], ['wall', 'c', 3]] }, // korsgång (pelarrader i katedralsten)
    waxpillars: { biome: 'hive', min: 24, fill: [['grid', 'W'], ['wall', 'j', 2]] }, // vaxpelarsal
    topiary: { biome: 'garden', min: 24, fill: [['grid', 'W'], ['wall', 'ƨ', 2]] }, // klippta häckar (häckblock i ett rutnät) och statyer
    dreamgallery: { biome: 'dream', min: 24, fill: [['ring', 'u'], ['wall', 'ƪ', 2]] }, // drömgalleri: statyring och drömlyktor
  };
  const SET14_ID = Object.keys(SET14);
  // tecken som rumstypen (arch) licensierar eller som bara får finnas i vissa rum: sådana rum byggs aldrig om
  const LICENSED14 = '()?;>ũŹżŰ²¯' + 'ƐƏƧƩƣƎ', LIC14_BIOME = { '_': 'volcano', ':': 'frost', 'Ç': 'frost', '-': 'swamp' }; // (lava, is och vatten: bara där biomen tillåter dem i alla rum)
  // Körs allra sist i content med egna slumpflöden (forks av content-slumpens 'v14'): allt från version 13 ligger kvar. Allt på kartan läggs med en
  // ångra-lista (opts.v14.undo: rutan och tecknet som stod där förut; opts.v14.arch: rummets index och gamla rumstyp): underkänns banan tas det bort
  // igen, level.arenas töms och banan blir exakt som i version 13 (se build7). Lägger arenarummen i G.arenas.
  function content14(G, depth, opts, L, H) {
    const { W, g, lock } = G, { rooms, fight, P, X, cnt, rid } = H, b = L.biome;
    const fk = tag => H.rng.fork(tag);
    G.arenas = [];
    if (opts.v14) { opts.v14.added = false; opts.v14.undo = []; opts.v14.arch = []; }
    const undo = opts.v14 ? opts.v14.undo : [], archUndo = opts.v14 ? opts.v14.arch : [];
    let added = false;
    const put = (x, y, ch) => { const o = g[y][x]; undo.push([x, y, o]); if (cnt[o]) cnt[o]--; g[y][x] = ch; cnt[ch] = (cnt[ch] || 0) + 1; added = true; };
    const doorNear = (x, y) => RX.some((dx, k) => isDoorCh(G.at(x + dx, y + RY[k])));
    const nearPX2 = (x, y) => cheb(x, y, P[0], P[1]) <= 2 || cheb(x, y, X[0], X[1]) <= 2;
    // flood fill från P (hinder, faror, grindar, hemliga väggar som vägg): allt som nåddes förut ska nås efteråt (hinder och faror: en granne nås)
    const reach = () => {
      const seen = new Uint8Array(W * G.H), st = [P[1] * W + P[0]]; seen[st[0]] = 1;
      while (st.length) {
        const i = st.pop(), x = i % W, y = (i / W) | 0;
        for (let d = 0; d < 4; d++) { const nx = x + DX[d], ny = y + DY[d], j = ny * W + nx; if (seen[j] || !G.inb(nx, ny)) continue; const c = g[ny][nx]; if (genBlk(c) || c === '*') { if (!isWall(c)) seen[j] = 2; continue; } seen[j] = 1; st.push(j); }
      }
      return seen;
    };

    // ----- nya handgjorda rumstyper (~40 % av banorna, en per bana): ett stridsrum byggs om med biomens rumstyp -----
    {
      const R = fk('setpieces'), mine = SET14_ID.filter(id => SET14[id].biome === b);
      if (mine.length && R.chance(SET14_P)) {
        const id = R.pick(mine), S = SET14[id];
        const wallCh = r => { const k = {}; let best = null; for (const [x, y] of r.cells) for (let d = 0; d < 4; d++) { const c = G.at(x + DX[d], y + DY[d]); if (isWall(c) && rid[(y + DY[d]) * W + x + DX[d]] < 0) { k[c] = (k[c] || 0) + 1; if (!best || k[c] > k[best]) best = c; } } return best; };
        const hosts = R.shuffle(rooms.filter(r => (r.type === 'normal' || r.type === 'elite') && r.cells.length >= S.min && !(ARCH[r.arch] && ARCH[r.arch].hazard)
          && r.arch !== 'nest' && !r.cells.some(([x, y]) => { const c = g[y][x]; return LICENSED14.includes(c) || (LIC14_BIOME[c] && LIC14_BIOME[c] !== b); })));
        for (const r of hosts.slice(0, 6)) {
          const base = reach(), mark = undo.length, wc = wallCh(r);
          const bx = r.box, hz = bx.w >= bx.h;
          const inR = (x, y) => G.inb(x, y) && rid[y * W + x] === r.id;
          const hazard = ch => ch === '_' || ch === '-' || ch === ':';
          const okAt = (x, y, ch) => {
            if (!inR(x, y) || g[y][x] !== '.' || doorNear(x, y) || nearPX2(x, y)) return false;
            const i = y * W + x, blk = genBlk(ch === 'W' ? '1' : ch);
            if (hazard(ch)) return !lock[i] && ![0, 1, 2, 3].some(d => isDoorCh(G.at(x + DX[d], y + DY[d])));
            return blk ? !lock[i] && localOK(G, x, y) : lock[i] < 2;
          };
          const stamp = (x, y, ch) => { const c = ch === 'W' ? wc : ch; if (!c || !okAt(x, y, ch)) return 0; put(x, y, c); return 1; };
          let n = 0;
          for (const [pat, ch, lim] of S.fill) {
            if (pat === 'rows' || pat === 'grid') {
              for (const [x, y] of r.cells) {
                const a = hz ? x - bx.x : y - bx.y, c = hz ? y - bx.y : x - bx.x, span = hz ? bx.h : bx.w;
                const on = pat === 'rows' ? (a % 2 === 1 && (c === 2 || c === span - 3) && a >= 2 && a <= (hz ? bx.w : bx.h) - 3)
                  : (a % 2 === 1 && c % 3 === 1 && c > 0 && c < span - 1 && a > 1 && a < (hz ? bx.w : bx.h) - 2);
                if (on) n += stamp(x, y, ch);
              }
            } else if (pat === 'ring') {
              const rad = Math.max(1.5, Math.min(bx.w, bx.h) / 2 - 1.5);
              const c = r.cells.filter(([x, y]) => Math.abs(Math.hypot(x - r.cx, y - r.cy) - rad) < 0.55).map(([x, y]) => [x, y, Math.atan2(y - r.cy, x - r.cx)]).sort((p, q) => p[2] - q[2]);
              const done = [];
              for (const [x, y] of c) { if (done.some(p => cheb(p[0], p[1], x, y) < 2)) continue; if (stamp(x, y, ch)) { done.push([x, y]); n++; } }
            } else if (pat === 'wall') {
              let k = 0;
              for (const [x, y] of R.shuffle(r.cells.filter(([x, y]) => [0, 1, 2, 3].some(d => isWall(G.at(x + DX[d], y + DY[d])))))) {
                if (k >= lim) break;
                if (stamp(x, y, ch)) k++;
              }
              n += k;
            } else if (pat === 'blob') {
              const rx = Math.max(1.5, bx.w / 2 - 2), ry = Math.max(1.5, bx.h / 2 - 2);
              for (const [x, y] of r.cells) if (Math.hypot((x - r.cx) / rx, (y - r.cy) / ry) <= 0.85 + 0.25 * R.next()) n += stamp(x, y, ch);
            } else if (pat === 'strip') { // en strimma tvärs över rummet (tvärs mot långsidan) med en bro om 2 rutor i mitten
              const mid = Math.round(hz ? r.cx : r.cy), span0 = hz ? bx.y : bx.x, span1 = hz ? bx.y + bx.h - 1 : bx.x + bx.w - 1, brd = Math.round(hz ? r.cy : r.cx);
              for (const off of [0, 1]) for (let t = span0; t <= span1; t++) {
                if (Math.abs(t - brd) <= 0 || t - brd === 1) continue; // bron
                const x = hz ? mid + off : t, y = hz ? t : mid + off;
                n += stamp(x, y, ch);
              }
            }
          }
          // allt som nåddes förut nås ändå (de nya rutorna undantagna), annars ångras rumstypen
          const now = reach(), mine2 = new Set(undo.slice(mark).map(([x, y]) => y * W + x));
          let ok = n >= 3;
          for (let i = 0; ok && i < base.length; i++) if (base[i] && !now[i] && !mine2.has(i)) ok = false;
          if (!ok) {
            for (let k = undo.length - 1; k >= mark; k--) { const [x, y, o] = undo[k]; cnt[g[y][x]]--; g[y][x] = o; cnt[o] = (cnt[o] || 0) + 1; }
            undo.length = mark;
            continue;
          }
          archUndo.push([rooms.indexOf(r), r.arch]); r.arch = id; added = true;
          break;
        }
      }
    }

    // ----- nya fiender: infödda i sin biom, byts in mot redan utplacerade fiender i stridsrummen (samma ruta i samma grupp) -----
    for (const ch of FOES14_CH) {
      const F = FOES14[ch];
      if (b !== F.home || depth < F.d) continue;
      const R = fk('foe-' + ch);
      if (!R.chance(F.p)) continue;
      let want = Math.min(F.max, R.int(F.n[0], F.n[1]));
      const mob = FOE_FROM + (NATIVE14[b] || '');
      const host = R.shuffle(fight.filter(r => r.arch !== 'nest' && r.type !== 'start'));
      const lavaNear = (x, y) => { for (let yy = y - 2; yy <= y + 2; yy++) for (let xx = x - 2; xx <= x + 2; xx++) if (G.at(xx, yy) === '_') return true; return false; };
      const wetNear = (x, y) => RX.some((dx, k) => WATER14.includes(G.at(x + dx, y + RY[k])));
      for (let pass = 0; pass < 2 && want > 0; pass++) for (const r of host) { // en per rum först, sedan tätare
        if (want <= 0) break;
        let c = R.shuffle(r.cells.filter(([x, y]) => mob.includes(g[y][x])));
        if (ch === 'ƅ') c = c.map(p => [p, lavaNear(p[0], p[1]) ? 0 : 1]).sort((p, q) => p[1] - q[1]).map(p => p[0]);
        if (ch === 'ƈ') {
          const wet = c.filter(([x, y]) => wetNear(x, y));
          if (wet.length) c = wet;
          else { // marulken: en fiende i rummet flyttas till en golvruta vid vattnet
            const spots = r.cells.filter(([x, y]) => g[y][x] === '.' && wetNear(x, y) && lock[y * W + x] < 2 && !doorNear(x, y) && !nearPX2(x, y));
            if (!spots.length || !c.length) continue;
            const s = R.pick(spots), m = c[0];
            put(m[0], m[1], '.'); put(s[0], s[1], ch); want--; continue;
          }
        }
        if (!c.length) continue;
        put(c[0][0], c[0][1], ch); want--;
      }
    }

    // ----- arenarum (djup 2+, ~45 % av banorna): ett rektangulärt stridsrum om minst 5x5 inre rutor, väggar runt om utom dörröppningarna -----
    {
      const R = fk('arena');
      if (depth >= 2 && R.chance(ARENA14_P)) {
        const BAD_IN = 'Px}Z÷ťMŃ' + GATES + '*' + SHIFT16; // (version 16: aldrig glidande väggar i en arena)
        for (const r of R.shuffle(rooms.filter(r => r.type === 'normal' || r.type === 'elite'))) {
          let x0 = W, y0 = G.H, x1 = -1, y1 = -1;
          for (const [x, y] of r.cells) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
          if (x1 - x0 < 4 || y1 - y0 < 4 || x0 < 2 || y0 < 2 || x1 > W - 3 || y1 > G.H - 3) continue;
          let ok = true;
          for (let y = y0; y <= y1 && ok; y++) for (let x = x0; x <= x1 && ok; x++) if ((rid[y * W + x] !== r.id && !isWall(g[y][x])) || BAD_IN.includes(g[y][x])) ok = false; // rummets rutor och väggar (pelare, runda hörn)
          if (!ok) continue;
          const doors = [];
          for (let y = y0 - 1; y <= y1 + 1 && ok; y++) for (let x = x0 - 1; x <= x1 + 1 && ok; x++) {
            if (x >= x0 && x <= x1 && y >= y0 && y <= y1) continue;
            const c = g[y][x], corner = (x === x0 - 1 || x === x1 + 1) && (y === y0 - 1 || y === y1 + 1);
            if (isWall(c)) continue;
            if (corner || GATES.includes(c) || c === '*' || c === 'Ń' || (c !== 'D' && c !== 'G' && genBlk(c))) { ok = false; break; }
            // dörröppningen och rutan innanför är fria (inga hinder eller rekvisita)
            const ix = Math.min(x1, Math.max(x0, x)), iy = Math.min(y1, Math.max(y0, y));
            if (genBlk(g[iy][ix])) { ok = false; break; }
            doors.push({ x, y });
          }
          if (!ok || !doors.length || doors.length > 4) continue;
          const mx = (x0 + x1 + 1) / 2, my = (y0 + y1 + 1) / 2; // belöningen hamnar i mitten: minst en av rutorna där är fritt golv
          const xs = [Math.floor(mx - 0.25), Math.floor(mx + 0.25)], ys = [Math.floor(my - 0.25), Math.floor(my + 0.25)];
          if (!xs.some(x => ys.some(y => !genBlk(g[y][x]) && !HAZARD.includes(g[y][x])))) continue;
          G.arenas.push({ x0, y0, x1, y1, doors, waves: depth >= 4 ? 3 : 2 });
          added = true;
          break;
        }
      }
    }
    if (added && opts.v14) opts.v14.added = true;
    return true;
  }

  // ---------- Version 15 och 16: blodkatedralen, bikupan, den döda trädgården och drömriket ----------
  // Körs allra sist i content (efter content14) med egna slumpflöden ur gafflarna 'v15' och 'v16'. De nya biomernas egna saker läggs alltid; det
  // som läggs i de gamla biomerna (inbytta fiender) och föremålen i alla biomer (bikupor ƞ, drömflaskor Ƴ) läggs med ångra-listor (opts.v15.undo,
  // opts.v16.undo): underkänns banan tas de bort igen och banan blir exakt som i version 14 resp. 15 (se build7). opts.v15off (som också stänger av
  // version 16) och opts.v16off stänger av dem helt i de gamla biomerna.
  const BELL15_CAP = 2, FONT15_CAP = 3, SAC15_CAP = 10, HONEY15_CAP = 36, BEAM15_CAP = 40, CHOIR15_CAP = 3, STINGER15_CAP = 2, SWARM15 = [3, 6];
  const BEEHIVE15_P = 0.2, BEEHIVE15_HIVE_P = 0.4, BEEHIVE15_CAP = 2;
  const FOUNTAIN16_CAP = 2, FALSEDOOR16_CAP = 4, THORN16_CAP = 30, MIST16_CAP = 30, ANGEL16_CAP = 2, VINE16_CAP = 4, DOPPEL16_CAP = 2, SLEEP16_CAP = 3;
  const DREAMFLASK16_P = 0.2, DREAMFLASK16_DREAM_P = 0.4, DREAMFLASK16_CAP = 2;
  // fienderna: tecken -> [biomer där de får finnas (första = hembiomen), första djup, tak per bana] (validate)
  const FOES1516 = { 'Ƒ': [['cathedral', 'dungeon'], 1, CHOIR15_CAP], 'ƒ': [['cathedral'], 1, 0], 'Ɯ': [['cathedral', 'graveyard'], 1, 0], 'Ƙ': [['hive', 'forest', 'swamp'], 1, 18],
    'ƙ': [['hive'], 2, STINGER15_CAP], 'ƚ': [['hive'], 1, 0],
    'ƭ': [['garden'], 1, 0], 'ƫ': [['garden'], 2, ANGEL16_CAP], 'Ƭ': [['garden', 'forest', 'courtyard'], 1, VINE16_CAP], 'Ʈ': [['dream', 'mirror', 'library'], 1, 0],
    'Ư': [['dream'], 2, DOPPEL16_CAP], 'ư': [['dream', 'graveyard'], 2, SLEEP16_CAP] };
  const FOES1516_CH = Object.keys(FOES1516).join('');
  const SHIFT16_CAP = 60, NEW1516_CHARS = [...'ƊƋƌƓƔƕƟƠơƢƣƤƍƖƥƦƎƏƐƗƧƨƩƪƞƳ', ...FOES1516_CH];
  const NATIVE1516 = { cathedral: 'ƒƜ', hive: 'ƚ', garden: 'ƭX', dream: 'Ʈ', library: 'ų', mirror: 'Ś' }; // biomernas egna (utöver FOE_FROM) som kan bytas
  const NEW1516 = ['cathedral', 'hive', 'garden', 'dream'];
  // gemensamma hjälpare för content15 och content16
  function kit1516(G, L, H, put) {
    const { W, g, lock } = G, { rooms, fight, P, X, cnt, trapOK, rid } = H;
    const doorNear = (x, y) => RX.some((dx, k) => isDoorCh(G.at(x + dx, y + RY[k]))); // dörr, grind, hemlig/sprucken vägg i de åtta grannarna
    const gRoom = rooms.find(r => r.type === 'guardian'), inG = (x, y) => !!gRoom && rid[y * W + x] === gRoom.id;
    const nearPX = (x, y, d) => cheb(x, y, P[0], P[1]) <= d || cheb(x, y, X[0], X[1]) <= d;
    // ett nytt hinder får inte stänga in en kruka, spikfälla, lavaruta o.d.
    const safe = (x, y) => [0, 1, 2, 3].every(d => {
      const nx = x + DX[d], ny = y + DY[d], c = g[ny][nx];
      if (!genBlk(c) || isBlock(c)) return true;
      const wet = isWet(c);
      return [0, 1, 2, 3].some(e => { const mx = nx + DX[e], my = ny + DY[e]; if (mx === x && my === y) return false; const m = G.at(mx, my); return !genBlk(m) || (wet && isWet(m)); });
    });
    const hidden = [];
    for (let y = 1; y < G.H - 1; y++) for (let x = 1; x < W - 1; x++) if (g[y][x] === '*' || g[y][x] === '{') hidden.push([x, y]);
    const nearHidden = (x, y) => hidden.some(([hx, hy]) => cheb(hx, hy, x, y) <= 2);
    const face = (x, y, wc) => x >= 0 && y >= 0 && x < W && y < G.H && g[y][x] === wc && !nearHidden(x, y) && [0, 1, 2, 3].some(d => !isWall(G.at(x + DX[d], y + DY[d])));
    // ingen ny fara intill en annan fara (utom den egna fläckens rutor)
    const HZ = SINK13 + BELT13 + SINK11 + '_z¬¯°<>±¨¹' + WET8 + SINK9 + 'Ńń' + SINK15 + SINK16 + FLOOR16;
    const touch = (x, y, own) => RX.some((dx, k) => { const xx = x + dx, yy = y + RY[k]; return HZ.includes(G.at(xx, yy)) && !own.some(p => p[0] === xx && p[1] === yy); });
    // flood fill från P med generatorns hinder (ƣ räknas som vägg): antal nådda rutor
    let seen = null, q = null;
    const reachN = () => {
      const N = W * G.H; if (!seen) { seen = new Uint8Array(N); q = new Int32Array(N); } else seen.fill(0);
      let qh = 0, qt = 0, n = 0; const s0 = P[1] * W + P[0]; seen[s0] = 1; q[qt++] = s0;
      while (qh < qt) {
        const cur = q[qh++], x = cur % W, y = (cur / W) | 0; n++;
        for (let d = 0; d < 4; d++) { const nx = x + DX[d], ny = y + DY[d], ni = ny * W + nx; if (nx < 0 || ny < 0 || nx >= W || ny >= G.H || seen[ni] || genBlk(g[ny][nx])) continue; seen[ni] = 1; q[qt++] = ni; }
      }
      return n;
    };
    // fläckar (honung, taggrankor, sömnens dimma): nP fläckar om 2-6 rutor i värdrummen (i ordning), högst cap rutor; aldrig vid dörrar, P eller x, i
    // vaktarens sal eller intill en annan fara; sink: aldrig enda vägen (localOK) och stänger aldrig in något
    const patches = (R, hosts, ch, nP, cap, sink) => {
      const okS = own => (x, y) => trapOK(x, y) && !doorNear(x, y) && !inG(x, y) && !touch(x, y, own) && (!sink || (localOK(G, x, y) && safe(x, y)));
      let left = nP, tot = 0;
      for (const r of hosts) {
        if (left <= 0 || (cnt[ch] || 0) >= cap) break;
        const s = R.shuffle(r.cells.filter(([x, y]) => okS([])(x, y)))[0];
        if (!s) continue;
        const want = R.int(2, 6), done = [], fr = [s], seenP = new Set([s[1] * W + s[0]]);
        while (fr.length && done.length < want && (cnt[ch] || 0) < cap) {
          const [x, y] = fr.splice(R.int(0, fr.length - 1), 1)[0];
          if (!okS(done)(x, y)) continue;
          put(x, y, ch); done.push([x, y]);
          for (let d = 0; d < 4; d++) { const nx = x + DX[d], ny = y + DY[d], ni = ny * W + nx; if (!seenP.has(ni) && rid[ni] === r.id) { seenP.add(ni); fr.push([nx, ny]); } }
        }
        if (done.length === 1) { const [x, y] = done[0]; g[y][x] = '.'; cnt[ch]--; } else if (done.length) { left--; tot += done.length; }
      }
      return tot;
    };
    const mobOf = r => r.cells.filter(([x, y]) => (FOE_FROM + (NATIVE1516[L.biome] || '')).includes(g[y][x]));
    // enstaka fiender ch (n st) inbytta i stridsrummen, en per rum först (pref: rummets prioritet, lägre först; minE: minsta gruppstorlek)
    const singles = (R, ch, n, o) => {
      o = o || {};
      const host = R.shuffle(fight.filter(r => r.arch !== 'nest' && r.type !== 'start' && (!o.minE || mobOf(r).length >= o.minE)));
      if (o.pref) host.sort((a, b) => o.pref(a) - o.pref(b));
      let k = 0;
      for (let pass = 0; pass < 2 && k < n; pass++) for (const r of host) {
        if (k >= n) break;
        let c = R.shuffle(mobOf(r));
        if (!c.length || (pass === 0 && r.cells.some(([x, y]) => g[y][x] === ch))) continue;
        if (o.cell) c = c.map(p => [p, o.cell(p[0], p[1]) ? 0 : 1]).sort((a, b) => a[1] - b[1]).map(p => p[0]);
        put(c[0][0], c[0][1], ch); k++;
      }
      return k;
    };
    // föremål (bikupor, drömflaskor): 1-cap st i en viss andel av banorna, helst i hemliga rum, valv och skattrum
    const loot = (R, ch, p, capN) => {
      let n0 = 0;
      const lr = rooms.filter(r => r.type !== 'guardian' && r.type !== 'shop' && r.type !== 'start');
      const n = R.chance(p) ? R.int(1, capN) : 0;
      for (let k = 0; k < n; k++) for (let t = 0; t < 6; t++) {
        const r = R.weighted(lr, q2 => (q2.type === 'secret' ? 3 : q2.type === 'vault' || q2.type === 'treasure' ? 2 : 1));
        const c = r && R.shuffle(r.cells.filter(([x, y]) => g[y][x] === '.' && lock[y * W + x] < 2 && !H.resv[y * W + x]))[0];
        if (c) { put(c[0], c[1], ch, true); n0++; break; }
      }
      return n0;
    };
    return { doorNear, inG, nearPX, safe, face, touch, reachN, patches, mobOf, singles, loot, gRoom };
  }

  function content15(G, depth, opts, L, H) {
    const { W, g, lock } = G, { rooms, fight, P, X, cnt, place } = H, b = L.biome;
    const fk = tag => H.rng.fork(tag);
    const cat = b === 'cathedral', hiv = b === 'hive', own = cat || hiv;
    if (opts.v15) { opts.v15.added = false; opts.v15.undo = []; }
    const undo = opts.v15 ? opts.v15.undo : [];
    let added = false;
    // i de gamla biomerna (och för föremålen) med ångra-lista
    const put = (x, y, ch, u) => { const o = g[y][x]; if (u || !own) { undo.push([x, y, o]); added = true; } if (cnt[o]) cnt[o]--; g[y][x] = ch; cnt[ch] = (cnt[ch] || 0) + 1; };
    const K = kit1516(G, L, H, put);
    const roomOK = r => !['guardian', 'secret', 'vault'].includes(r.type);

    // ----- blodkatedralen: blyinfattade fönster med ljusstråk, fler bänkar, blodfuntar, en klocka till och korgossar -----
    if (cat) {
      // fönster Ƌ i katedralstenen runt salarna (långhuset tätt, övriga glest), aldrig två intill varandra eller vid den hemliga väggen; ljusstråk ƍ
      // (1-3 rutor) på golvet framför många av dem: aldrig vid dörrar, P eller x, bara på fritt golv i salen
      const R = fk('windows');
      for (const r of R.shuffle(rooms.filter(roomOK))) {
        const nave = r.arch === 'nave', faces = [];
        for (const [x, y] of r.cells) for (let d = 0; d < 4; d++) {
          const xx = x + DX[d], yy = y + DY[d];
          if (K.face(xx, yy, 'Ɗ') && !faces.some(f => f[0] === xx && f[1] === yy)) faces.push([xx, yy, (d + 2) & 3]);
        }
        const p = nave ? 0.5 : r.type === 'shrine' || r.arch === 'chapel' || r.arch === 'baptistery' ? 0.3 : 0.12;
        for (const [x, y, din] of R.shuffle(faces)) {
          if (!R.chance(p) || RX.some((dx, k) => G.at(x + dx, y + RY[k]) === 'Ƌ')) continue;
          g[y][x] = 'Ƌ';
          if (!R.chance(nave ? 0.75 : 0.5) || (cnt['ƍ'] || 0) >= BEAM15_CAP) continue;
          const ix = DX[din], iy = DY[din]; // inåt i salen (din pekar från väggen in mot golvet)
          for (let k = 1, len = R.int(1, nave ? 3 : 2); k <= len; k++) {
            const bx = x + ix * k, by = y + iy * k;
            if (!G.inb(bx, by) || g[by][bx] !== '.' || H.rid[by * W + bx] !== r.id || K.doorNear(bx, by) || K.nearPX(bx, by, 1) || H.resv[by * W + bx]) break;
            put(bx, by, 'ƍ');
          }
        }
      }
      // bänkar längs väggarna i kapellen
      { const R2 = fk('pews'); for (const r of rooms.filter(r => r.arch === 'chapel')) place(r, 'Ǝ', R2.int(1, 2), { wall: true, spread: 2, rng: R2, pred: K.safe }); }
      // blodfuntar: dopkapellen har sina; ibland en till i ett stridsrum (högst tre)
      {
        const R2 = fk('fonts');
        if (R2.chance(0.45)) for (const r of R2.shuffle(fight.filter(r => r.type !== 'start'))) if (place(r, 'Ə', 1, { open: true, rng: R2, pred: (x, y) => K.safe(x, y) && !K.nearPX(x, y, 2) }).length) break;
      }
      // klockor: klocktornen har sina (högst två per bana); utan klocktorn ibland en klocka mot en vägg i långhuset eller ett kapell
      if (!cnt['Ɛ']) {
        const R2 = fk('bells');
        if (R2.chance(0.4)) for (const r of R2.shuffle(rooms.filter(r => ['nave', 'chapel', 'baptistery'].includes(r.arch)))) if (place(r, 'Ɛ', 1, { wall: true, rng: R2, pred: (x, y) => K.safe(x, y) && !K.nearPX(x, y, 2) }).length) break;
      }
      // korgossar Ƒ (~70 %, 1-2): byts in i en grupp om minst 3 (de läker och skyddar de andra)
      { const R2 = fk('choir'); if (R2.chance(0.7)) K.singles(R2, 'Ƒ', R2.int(1, 2), { minE: 3 }); }
    }

    // ----- bikupan: honungskakor i väggarna, honung, larvsäckar, svärmar av arbetsbin och gaddkrigare -----
    if (hiv) {
      {
        const R = fk('combs'); // honungskakor Ɣ: sträckor om 1-3 rutor i de synliga vaxväggarna, aldrig vid den hemliga/spruckna väggen
        for (let y = 0; y < G.H; y++) for (let x = 0; x < W; x++) {
          if (!K.face(x, y, 'Ɠ') || !R.chance(0.07)) continue;
          g[y][x] = 'Ɣ';
          let cx = x, cy = y;
          for (let k = R.int(0, 2); k > 0; k--) { const nb = [0, 1, 2, 3].map(d => [cx + DX[d], cy + DY[d]]).filter(([nx, ny]) => K.face(nx, ny, 'Ɠ')); if (!nb.length) break; [cx, cy] = R.pick(nb); g[cy][cx] = 'Ɣ'; }
        }
      }
      // honung Ɩ: 3-5 fläckar om 2-6 rutor (honungssalarna först, två fläckar var), högst HONEY15_CAP rutor; aldrig enda vägen
      {
        const R = fk('honey'), halls = R.shuffle(rooms.filter(r => r.arch === 'honeyhall'));
        const hosts = halls.concat(halls, R.shuffle(rooms.filter(r => (H.isCombat(r) || r.type === 'treasure') && r.arch !== 'honeyhall')));
        K.patches(R, hosts, 'Ɩ', R.int(3, 5), HONEY15_CAP, true);
      }
      // larvsäckar Ɨ: larvkamrarna och vaxcellerna har sina; 1-3 till mot väggarna i stridsrummen (högst SAC15_CAP)
      { const R = fk('sacs'); let n = R.int(1, 3); for (const r of R.shuffle(fight.filter(r => r.type !== 'start'))) { if (n <= 0) break; n -= place(r, 'Ɨ', 1, { wall: true, rng: R, pred: (x, y) => K.safe(x, y) && !K.nearPX(x, y, 2) }).length; } }
      // arbetsbin Ƙ: 1 svärm (djup 3+ ibland 2) om 3-6: hela gruppen i ett stridsrum byts mot bin; en grupp om två får ett bi till (högst två extra per bana)
      {
        const R = fk('swarms');
        let want = R.chance(0.9) ? (depth >= 3 && R.chance(0.4) ? 2 : 1) : 0, extra = 2;
        const host = R.shuffle(fight.filter(r => r.arch !== 'nest' && r.type !== 'start')).sort((p, q) => (K.mobOf(q).length >= 3 ? 1 : 0) - (K.mobOf(p).length >= 3 ? 1 : 0));
        for (const r of host) {
          if (want <= 0) break;
          const c = K.mobOf(r);
          if (c.length < 2 || c.length > SWARM15[1]) continue;
          let spot = null;
          if (c.length < SWARM15[0]) {
            if (extra <= 0) continue;
            spot = R.shuffle(r.cells.filter(([x, y]) => g[y][x] === '.' && lock[y * W + x] < 2 && !H.resv[y * W + x] && Math.hypot(x - P[0], y - P[1]) >= 7 && c.some(p => cheb(p[0], p[1], x, y) <= 3)))[0];
            if (!spot) continue;
            put(spot[0], spot[1], 'Ƙ'); extra--;
          }
          for (const [x, y] of c) put(x, y, 'Ƙ');
          want--;
        }
      }
      // gaddkrigare ƙ (djup 2+, ~60 %, 1-2, högst 2): byts in i stridsrummen
      { const R = fk('stingers'); if (depth >= 2 && R.chance(0.6)) K.singles(R, 'ƙ', Math.min(STINGER15_CAP, R.chance(0.35) ? 2 : 1)); }
    }

    // ----- de gamla biomerna (med ångra-lista): korgossar i fängelsehålans kapell, keruber på kyrkogården, en svärm arbetsbin i skogen/träsket -----
    if (!own && !opts.v15off) {
      if (b === 'dungeon') { const R = fk('near-choir'); if (R.chance(0.1)) K.singles(R, 'Ƒ', 1, { minE: 3, pref: r => (r.arch === 'chapel' ? 0 : 1) }); }
      if (b === 'graveyard') { const R = fk('near-cherub'); if (R.chance(0.1)) K.singles(R, 'Ɯ', 1); }
      if (b === 'forest' || b === 'swamp') {
        const R = fk('near-swarm');
        if (R.chance(0.08)) for (const r of R.shuffle(fight.filter(r => r.arch !== 'nest' && r.type !== 'start'))) {
          const c = K.mobOf(r); if (c.length < SWARM15[0] || c.length > SWARM15[1]) continue;
          for (const [x, y] of c) put(x, y, 'Ƙ');
          break;
        }
      }
    }
    // ----- alla biomer: bikupor ƞ (ammo till bikastaren; ~20 %, bikupan ~40 %, 1-2) med ångra-lista -----
    if (!opts.v15off || own) K.loot(fk('beehives'), 'ƞ', hiv ? BEEHIVE15_HIVE_P : BEEHIVE15_P, BEEHIVE15_CAP);
    if (added && opts.v15) opts.v15.added = true;
    return true;
  }

  function content16(G, depth, opts, L, H) {
    const { W, g, lock } = G, { rooms, fight, P, X, cnt, place } = H, b = L.biome;
    const fk = tag => H.rng.fork(tag);
    const gar = b === 'garden', drm = b === 'dream', own = gar || drm;
    if (opts.v16) { opts.v16.added = false; opts.v16.undo = []; }
    const undo = opts.v16 ? opts.v16.undo : [];
    let added = false;
    const put = (x, y, ch, u) => { const o = g[y][x]; if (u || !own) { undo.push([x, y, o]); added = true; } if (cnt[o]) cnt[o]--; g[y][x] = ch; cnt[ch] = (cnt[ch] || 0) + 1; };
    const K = kit1516(G, L, H, put);

    // ----- den döda trädgården: taggrankor, statyer, en fontän, taggrankor (fienden) och stenänglar -----
    if (gar) {
      // taggrankor ƥ: 2-4 fläckar om 2-6 rutor (häckgångar, murade trädgårdar och gräsmattor först), högst THORN16_CAP; aldrig enda vägen
      {
        const R = fk('thorns'), pri = r => (['hedgewalk', 'walledgarden'].includes(r.arch) ? 0 : r.tag === 'yard' ? 1 : 2);
        const hosts = R.shuffle(rooms.filter(r => (H.isCombat(r) || r.type === 'treasure'))).sort((p, q) => pri(p) - pri(q));
        K.patches(R, hosts, 'ƥ', R.int(2, 4), THORN16_CAP, true);
      }
      // stenstatyer ƨ: 1-2 till mot väggarna
      { const R = fk('statues'); let n = R.int(1, 2); for (const r of R.shuffle(rooms.filter(r => !['guardian', 'secret', 'vault', 'shop', 'start'].includes(r.type)))) { if (n <= 0) break; n -= place(r, 'ƨ', 1, { wall: true, rng: R, pred: (x, y) => K.safe(x, y) && !K.nearPX(x, y, 2) }).length; } }
      // fontän Ƨ: fontängårdarna har sina; annars ofta en på en gräsmatta eller i en stor sal (högst två)
      if (!cnt['Ƨ']) {
        const R = fk('fountain');
        if (R.chance(0.6)) for (const r of R.shuffle(rooms.filter(r => (r.tag === 'yard' || r.cells.length >= 30) && !['guardian', 'secret', 'vault', 'shop'].includes(r.type))))
          if (place(r, 'Ƨ', 1, { open: true, center: true, jit: 2, rng: R, pred: (x, y) => K.safe(x, y) && !K.nearPX(x, y, 2) }).length) break;
      }
      // taggrankor Ƭ (fienden, ~75 %, 1-3, högst 4): byts in, helst intill en vägg/häck (de är rotade)
      { const R = fk('vines'); if (R.chance(0.75)) K.singles(R, 'Ƭ', Math.min(VINE16_CAP, R.int(1, 3)), { cell: (x, y) => [0, 1, 2, 3].some(d => isWall(G.at(x + DX[d], y + DY[d]))) }); }
      // stenänglar ƫ (djup 2+, ~55 %, 1-2, högst 2)
      { const R = fk('angels'); if (depth >= 2 && R.chance(0.55)) K.singles(R, 'ƫ', R.chance(0.35) ? 2 : 1); }
    }

    // ----- drömriket: drömlyktor, glidande väggar i korridorerna, sömnens dimma, falska dörrar, speglingar och sömngångare -----
    if (drm) {
      // drömlyktor ƪ i stället för eldfaten (utom i vaktarens sal), bara där eldfatet har en gångbar granne utan fara
      const walk = c => !isBlock(c) && !HAZARD.includes(c);
      for (let y = 1; y < G.H - 1; y++) for (let x = 1; x < W - 1; x++) if (g[y][x] === 'f' && !K.inG(x, y) && [0, 1, 2, 3].some(d => walk(g[y + DY[d]][x + DX[d]]))) { g[y][x] = 'ƪ'; cnt.f--; cnt['ƪ'] = (cnt['ƪ'] || 0) + 1; }
      // glidande väggar ƣ i korridorerna (1-3 sträckor om 1-2 rutor) och, om banan har färre än två, i stridsrummen: aldrig på låsta rutor, intill en
      // dörr/grind/hemlig vägg eller inom 2 rutor från P och x; varje sträcka bara om allt som nåddes förut nås med väggen uppe (ƣ som vägg)
      {
        const R = fk('shifts');
        let base = K.reachN();
        const okC = (x, y) => G.inb(x, y) && g[y][x] === '.' && !lock[y * W + x] && !H.resv[y * W + x] && !K.doorNear(x, y) && !K.nearPX(x, y, 2) && K.safe(x, y)
          && !G.arenas.some(a => x >= a.x0 - 2 && x <= a.x1 + 2 && y >= a.y0 - 2 && y <= a.y1 + 2);
        const seg = (cells) => {
          for (const [x, y] of cells) g[y][x] = SHIFT16;
          const n = K.reachN();
          if (n !== base - cells.length) { for (const [x, y] of cells) g[y][x] = '.'; return false; }
          base = n; const ph = R.int(0, 39) / 10;
          for (const [x, y] of cells) { cnt[SHIFT16] = (cnt[SHIFT16] || 0) + 1; G.shifts.push({ x, y, ph }); }
          return true;
        };
        const tryAt = (x, y, k) => { // en sträcka om 1-2 rutor längs en rak riktning
          if (!okC(x, y)) return false;
          const d = R.int(0, 3), x2 = x + DX[d], y2 = y + DY[d];
          const two = R.chance(0.5) && okC(x2, y2) && (k < 0 ? H.rid[y2 * W + x2] < 0 : H.rid[y2 * W + x2] === k);
          return seg(two ? [[x, y], [x2, y2]] : [[x, y]]);
        };
        let n = 0;
        const want = R.int(1, 3);
        for (const [x, y] of R.shuffle((H.corridors || []).filter(([x, y]) => H.rid[y * W + x] < 0))) { if (n >= want) break; if (tryAt(x, y, -1)) n++; }
        if (G.shifts.length < 2) for (const r of R.shuffle(fight.filter(r => r.type !== 'start' && !G.arenas.some(a => r.cx >= a.x0 && r.cx <= a.x1 && r.cy >= a.y0 && r.cy <= a.y1)))) {
          if (G.shifts.length >= 2) break;
          for (const [x, y] of R.shuffle(r.cells.slice())) { if (G.shifts.length >= 2) break; tryAt(x, y, r.id); }
        }
      }
      // sömnens dimma Ʀ: 2-4 fläckar om 2-6 rutor i strids- och skattrummen, högst MIST16_CAP (gångbar, men aldrig vid dörrar, P eller x)
      { const R = fk('mist'); K.patches(R, R.shuffle(rooms.filter(r => H.isCombat(r) || r.type === 'treasure')), 'Ʀ', R.int(2, 4), MIST16_CAP, false); }
      // falska dörrar Ʃ: de falska dörrarnas rum har sina; ibland en till mot en vägg i ett stridsrum (högst FALSEDOOR16_CAP)
      {
        const R = fk('falsedoors'), front = (x, y) => [0, 1, 2, 3].some(k => isWall(g[y + DY[k]][x + DX[k]]) && g[y - DY[k]][x - DX[k]] === '.' && lock[(y - DY[k]) * W + x - DX[k]] < 2);
        if (R.chance(0.5)) for (const r of R.shuffle(fight.filter(r => r.type !== 'start'))) if (place(r, 'Ʃ', 1, { wall: true, rng: R, pred: (x, y) => front(x, y) && K.safe(x, y) && !K.nearPX(x, y, 2) }).length) break;
      }
      // speglingar Ư (djup 2+, ~50 %, 1-2, högst 2) och sömngångare ư (djup 2+, ~60 %, 1-2): byts in i stridsrummen
      { const R = fk('doppel'); if (depth >= 2 && R.chance(0.5)) K.singles(R, 'Ư', R.chance(0.3) ? 2 : 1); }
      { const R = fk('sleepers'); if (depth >= 2 && R.chance(0.6)) K.singles(R, 'ư', R.chance(0.4) ? 2 : 1); }
    }

    // ----- de gamla biomerna (med ångra-lista): taggrankor i skogen/borggården, drömätare i spegelpalatset/biblioteket, en sömngångare på kyrkogården -----
    if (!own && !opts.v16off && !opts.v15off) {
      if (b === 'forest' || b === 'courtyard') { const R = fk('near-vine'); if (R.chance(0.12)) K.singles(R, 'Ƭ', R.int(1, 2), { cell: (x, y) => [0, 1, 2, 3].some(d => isBlock(G.at(x + DX[d], y + DY[d]))) }); }
      if (b === 'mirror' || b === 'library') { const R = fk('near-eater'); if (R.chance(0.1)) K.singles(R, 'Ʈ', 1); }
      if (b === 'graveyard' && depth >= 2) { const R = fk('near-sleeper'); if (R.chance(0.08)) K.singles(R, 'ư', 1); }
    }
    // ----- alla biomer: drömflaskor Ƴ (ammo till drömstaven; ~20 %, drömriket ~40 %, 1-2) med ångra-lista -----
    if ((!opts.v16off && !opts.v15off) || own) K.loot(fk('dreamflasks'), 'Ƴ', drm ? DREAMFLASK16_DREAM_P : DREAMFLASK16_P, DREAMFLASK16_CAP);
    if (added && opts.v16) opts.v16.added = true;
    return true;
  }

  // ---------- Områden för biomerna: start, utgång, områdesindelning, sedan content ----------
  // cfg: { biome, gid, floors, guardian: { cells, center, doors: [[x, y] utanför ingången] }, P, X: [x,y] (annars BFS-längst
  //   bort från vaktaren resp. P), seeds: [{x, y, tag, box | cells}] (utsedda områden, växer inte), areaCells (önskad storlek
  //   på övriga områden), treasureTags, extraChest, eliteTags, shrineTags, barrels: {p, min, tags}, secretWall, secretChance, spikes }
  function populate(G, rng, depth, opts, cfg) {
    const { W, H, g, lock } = G, N = W * H;
    const gr = cfg.guardian, inG = new Uint8Array(N);
    for (const [x, y] of gr.cells) inG[y * W + x] = 1;
    const freeCells = () => { const out = []; for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) if (g[y][x] === '.' && lock[y * W + x] < 2 && !inG[y * W + x]) out.push([x, y]); return out; };
    const farthest = (d, frac) => {
      const fr = freeCells().filter(([x, y]) => d[y * W + x] >= 0);
      if (!fr.length) return null;
      let mx = 0; for (const [x, y] of fr) mx = Math.max(mx, d[y * W + x]);
      return rng.pick(fr.filter(([x, y]) => d[y * W + x] >= mx * frac));
    };
    // ----- start långt från vaktarens sal, utgången långt från start -----
    let P = cfg.P;
    if (!P) P = farthest(bfsG(G, gr.doors), 0.85);
    if (!P || g[P[1]][P[0]] !== '.' || inG[P[1] * W + P[0]] || Math.hypot(P[0] - gr.center[0], P[1] - gr.center[1]) < 8) return null;
    g[P[1]][P[0]] = 'P';
    const dS = bfsG(G, [P]);
    const X = cfg.X || farthest(dS, 0.92);
    if (!X || g[X[1]][X[0]] !== '.' || dS[X[1] * W + X[0]] < 0 || inG[X[1] * W + X[0]]) return null;
    if (dS[gr.center[1] * W + gr.center[0]] < 0) return null;
    g[X[1]][X[0]] = 'x';
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { G.lockMin(P[0] + dx, P[1] + dy, 1); G.lockMin(X[0] + dx, X[1] + dy, 1); }

    // ----- områden: vaktaren, utsedda (byggnader, gläntor), start, sedan längst-bort-utspridda frön som växer -----
    const aid = new Int16Array(N).fill(-1), areas = [];
    const open = i => dS[i] >= 0 && !isDoorCh(g[(i / W) | 0][i % W]); // dörrar hör inte till något område
    const newArea = (tag, type) => { const a = { id: areas.length, tag, type: type || 'normal', cells: [] }; areas.push(a); return a; };
    const claim = (a, i) => { aid[i] = a.id; a.cells.push([i % W, (i / W) | 0]); };
    const ga = newArea('guardian', 'guardian');
    for (const [x, y] of gr.cells) if (open(y * W + x)) claim(ga, y * W + x);
    for (const s of cfg.seeds || []) {
      const a = newArea(s.tag);
      const list = s.cells || [];
      if (s.box) for (let y = s.box.y; y < s.box.y + s.box.h; y++) for (let x = s.box.x; x < s.box.x + s.box.w; x++) list.push([x, y]);
      for (const [x, y] of list) { const i = y * W + x; if (aid[i] < 0 && open(i)) claim(a, i); }
      if (!a.cells.length) { areas.pop(); continue; }
      a.cx = s.x; a.cy = s.y;
    }
    let start = aid[P[1] * W + P[0]] >= 0 ? areas[aid[P[1] * W + P[0]]] : null;
    if (start && start.type === 'guardian') return null;
    if (!start) { // rutorna inom 5 steg från P
      start = newArea('start');
      const q = [P[1] * W + P[0]], dd = new Map([[q[0], 0]]); claim(start, q[0]);
      for (let qh = 0; qh < q.length; qh++) {
        const cur = q[qh], x = cur % W, y = (cur / W) | 0;
        if (dd.get(cur) >= 5) continue;
        for (let d = 0; d < 4; d++) { const ni = (y + DY[d]) * W + x + DX[d]; if (aid[ni] < 0 && open(ni)) { claim(start, ni); dd.set(ni, dd.get(cur) + 1); q.push(ni); } }
      }
    }
    start.type = 'start';
    const rest = []; for (let i = 0; i < N; i++) if (aid[i] < 0 && open(i)) rest.push(i);
    const maxCombat = Math.max(3, Math.round((6 + 3 * depth) / 2.4));
    const desig = areas.filter(a => a.type === 'normal').length;
    const K = rest.length ? Math.max(cfg.minOpen || 1, Math.min(Math.round(rest.length / (cfg.areaCells || 90)), maxCombat + 2 - desig)) : 0;
    const md = new Float32Array(rest.length);
    for (let j = 0; j < rest.length; j++) md[j] = Math.hypot(rest[j] % W - P[0], ((rest[j] / W) | 0) - P[1]);
    const q = [];
    for (let k = 0; k < K; k++) {
      let best = -1, bv = -1;
      for (let j = 0; j < rest.length; j++) { const v = md[j] + rng.next() * 2; if (v > bv) { bv = v; best = j; } }
      const i = rest[best], sx = i % W, sy = (i / W) | 0;
      claim(newArea('open'), i); q.push(i);
      for (let j = 0; j < rest.length; j++) { const ex = rest[j] % W - sx, ey = ((rest[j] / W) | 0) - sy, d = Math.sqrt(ex * ex + ey * ey); if (d < md[j]) md[j] = d; }
    }
    const grow = q => {
      for (let qh = 0; qh < q.length; qh++) {
        const cur = q[qh], x = cur % W, y = (cur / W) | 0;
        for (let d = 0; d < 4; d++) {
          const nx = x + DX[d], ny = y + DY[d], ni = ny * W + nx;
          if (!G.inb(nx, ny) || aid[ni] >= 0 || !open(ni)) continue;
          aid[ni] = aid[cur]; areas[aid[cur]].cells.push([nx, ny]); q.push(ni);
        }
      }
    };
    grow(q);
    { const q2 = []; for (let i = 0; i < N; i++) if (aid[i] >= 0 && areas[aid[i]].type !== 'guardian') q2.push(i); grow(q2); } // fickor bakom byggnader
    for (let i = 0; i < N; i++) if (aid[i] < 0 && open(i)) { const a = newArea('open'); claim(a, i); grow([i]); } // fickor som bara nås via vaktarens sal
    // ----- slå ihop för små områden, och för många öppna (varje stridsområde ska få en hel grupp) -----
    for (let it = 0; it < 80; it++) {
      const op = areas.filter(a => !a.dead && a.tag === 'open' && !a.stuck);
      let v = op.filter(a => a.cells.length < 20).sort((a, b) => a.cells.length - b.cells.length)[0];
      const small = !!v;
      if (!v && op.length > K) v = op.sort((a, b) => a.cells.length - b.cells.length)[0];
      if (!v) break;
      const border = new Map();
      for (const [x, y] of v.cells) for (let d = 0; d < 4; d++) {
        const b = aid[(y + DY[d]) * W + x + DX[d]];
        if (b < 0 || b === v.id) continue;
        const o = areas[b];
        if (o.type === 'guardian' || (!small && o.tag !== 'open')) continue;
        border.set(b, (border.get(b) || 0) + 1 + (o.tag === 'open' ? 100 : 0));
      }
      if (!border.size) { v.stuck = true; continue; }
      let best = -1, bv = -1; for (const [b, c] of border) if (c > bv) { bv = c; best = b; }
      const tgt = areas[best];
      for (const [x, y] of v.cells) { aid[y * W + x] = tgt.id; tgt.cells.push([x, y]); }
      v.cells = []; v.dead = true;
    }
    const keep = areas.filter(a => !a.dead), remap = new Int16Array(areas.length).fill(-1);
    keep.forEach((a, k) => { remap[a.id] = k; a.id = k; });
    for (let i = 0; i < N; i++) if (aid[i] >= 0) aid[i] = remap[aid[i]];
    for (const a of keep) {
      if (a.type === 'guardian') [a.cx, a.cy] = gr.center;
      else if (a.type === 'start') [a.cx, a.cy] = P;
      else if (a.tag === 'open' || a.cx === undefined || aid[a.cy * W + a.cx] !== a.id) { // tyngdpunkt -> närmaste egna ruta
        let sx = 0, sy = 0; for (const [x, y] of a.cells) { sx += x; sy += y; }
        sx /= a.cells.length; sy /= a.cells.length;
        let best = a.cells[0], bd = 1e9; for (const c of a.cells) { const d = Math.hypot(c[0] - sx, c[1] - sy); if (d < bd) { bd = d; best = c; } }
        [a.cx, a.cy] = best;
      }
      a.d = dS[a.cy * W + a.cx];
      let x0 = W, y0 = H, x1 = 0, y1 = 0;
      for (const [x, y] of a.cells) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
      a.box = { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
      a.indoor = !G.sky[a.cy * W + a.cx];
    }
    const exitA = keep[aid[X[1] * W + X[0]]];
    if (!exitA || exitA === start || exitA.type === 'guardian') return null;
    exitA.type = 'exit';
    { const x0 = Math.max(1, P[0] - 3), y0 = Math.max(1, P[1] - 3); start.outBox = { x: x0, y: y0, w: Math.min(W - 2, P[0] + 3) - x0 + 1, h: Math.min(H - 2, P[1] + 3) - y0 + 1 }; }

    const sec = cfg.secretWall && rng.chance(cfg.secretChance || 0) ? addSecretG(G, rng, cfg.secretWall) : null;
    let srec = null;
    if (sec) {
      const cells = [];
      for (let y = sec.y; y < sec.y + 3; y++) for (let x = sec.x; x < sec.x + 3; x++) { aid[y * W + x] = keep.length; cells.push([x, y]); }
      srec = { id: keep.length, type: 'secret', tag: 'secret', cells, cx: sec.cx, cy: sec.cy, box: { x: sec.x, y: sec.y, w: 3, h: 3 }, d: 0, indoor: !G.sky[sec.cy * W + sec.cx], door: sec.door };
      keep.push(srec);
    }
    const res = content(G, rng, depth, opts, { biome: cfg.biome, P, X, rooms: keep, rid: aid, floors: cfg.floors, gid: cfg.gid,
      guardian: { center: gr.center }, secret: srec, spikes: cfg.spikes || 0, vaultWall: cfg.vaultWall, cfg });
    if (!res) return null;
    return { G, rooms: res.rooms, roomMask: res.roomMask, floors: res.floors };
  }

  // ---------- Grottor: cellautomat, vaktarens lya nära kanten ----------
  function buildCaves(rng, depth, opts, look, K) {
    const [W, H] = mapSize(rng, depth), wc = look.wall, N = W * H;
    const G = Grid(W, H, wc), { g } = G;
    // 45 % berg, sedan utjämning: berg om >= 5 av 3x3 är berg (de första varven även där 5x5 nästan är tomt -> pelare)
    let a = new Uint8Array(N);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) a[y * W + x] = G.inb(x, y) && rng.next() >= 0.45 ? 0 : 1;
    const R = (b, x, y, r) => { let n = 0; for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const xx = x + dx, yy = y + dy; n += (xx < 0 || yy < 0 || xx >= W || yy >= H) ? 1 : b[yy * W + xx]; } return n; };
    for (let it = 0; it < 5; it++) {
      const b = new Uint8Array(N).fill(1);
      for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) b[y * W + x] = R(a, x, y, 1) >= 5 || (it < 3 && R(a, x, y, 2) <= 2) ? 1 : 0;
      a = b;
    }
    // fyllnadsgrad i rimligt spann, annars ny cellautomat
    let nOpen = 0; for (let i = 0; i < N; i++) if (!a[i]) nOpen++;
    if (nOpen < (W - 2) * (H - 2) * 0.3) return null;
    // fyllerigång: några slingrande gångar (1-2 breda) som skapar fler förbindelser
    const opens = []; for (let i = 0; i < N; i++) if (!a[i]) opens.push(i);
    for (let k = rng.int(1, 3); k > 0; k--) {
      const s = rng.pick(opens); let x = s % W, y = (s / W) | 0, d = rng.int(0, 3);
      for (let st = rng.int(20, 45); st > 0; st--) {
        if (rng.chance(0.25)) d = (d + (rng.chance(0.5) ? 1 : 3)) & 3;
        const nx = x + DX[d], ny = y + DY[d];
        if (nx < 2 || ny < 2 || nx > W - 3 || ny > H - 3) { d = (d + 2) & 3; continue; }
        x = nx; y = ny; a[y * W + x] = 0;
        if (rng.chance(0.55)) { const p = (d + 1) & 3; a[(y + DY[p]) * W + x + DX[p]] = 0; }
      }
    }
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) g[y][x] = a[y * W + x] ? wc : '.';
    // vaktarens lya: rund sal nära kartans kant, ring av vaktarens väggtecken, 1-2 öppningar med tunnlar ut i grottan
    const rad = rng.int(4, 5), m = rad + 2, cs = [];
    for (let y = m; y <= H - 1 - m; y++) for (let x = m; x <= W - 1 - m; x++) cs.push([x, y, Math.hypot(x - W / 2, y - H / 2) + rng.next() * 5]);
    cs.sort((u, v) => v[2] - u[2]);
    const [gx, gy] = cs[rng.int(0, Math.min(cs.length - 1, 25))];
    const lair = stampLair(G, rng, gx, gy, rad, K.wall, K.bossIdx, 0);
    const gaps = lairGaps(G, rng, lair, rng.chance(0.4) ? 2 : 1, (x, y) => Math.hypot(x - W / 2, y - H / 2));
    if (!gaps.length) return null;
    const nz = new Float32Array(N); for (let i = 0; i < N; i++) nz[i] = rng.next();
    for (const gp of gaps) {
      const s = gp.out[1] * W + gp.out[0];
      const path = dijkstra(G, [s], i => g[(i / W) | 0][i % W] === '.' && !lair.inside[i] && cheb(i % W, (i / W) | 0, gp.out[0], gp.out[1]) > 1,
        i => (G.solid[i] || G.res[i] ? Infinity : g[(i / W) | 0][i % W] === '.' ? 0.3 : 1 + nz[i]));
      if (!path) return null;
      for (const i of path) for (const [xx, yy] of [[i % W, (i / W) | 0], [i % W + 1, (i / W) | 0]]) if (G.inb(xx, yy) && !G.solid[yy * W + xx] && !G.res[yy * W + xx]) g[yy][xx] = '.';
    }
    // största grottan behålls, andra stora kopplas dit med två rutor breda tunnlar, småfickor fylls igen
    if (!connectRegions(G, rng, { minSize: 16, fillCh: wc, width: 2 })) return null;
    nOpen = 0; for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) if (g[y][x] === '.') nOpen++;
    const share = nOpen / ((W - 2) * (H - 2));
    if (share < 0.3 || share > 0.66) return null;
    // droppstenar i för stora salar
    breakOpen(G, rng, 5, (x, y) => { if (plantNear(G, rng, x, y, wc, 1) && rng.chance(0.5)) plantNear(G, rng, x + rng.int(-1, 1), y + rng.int(-1, 1), wc, 1); });
    // lerfläckar
    const M = fbm(rng, W, H, 5);
    for (let i = 0; i < N; i++) if (M[i] < 0.3 && !G.res[i]) G.fm[i] = 1;
    return populate(G, rng, depth, opts, { biome: look.biome || 'caves', gid: K.id, floors: K.floors, guardian: { cells: lair.cells, center: [gx, gy], doors: gaps.map(c => c.out) },
      areaCells: 75, barrels: { p: 0.45, min: 3 }, secretWall: wc, secretChance: 0.55, spikes: rng.int(1, 3), vaultWall: wc });
  }

  // ---------- Kyrkogård: öppet fält, kapell, kryptor, gravkvarter, vaktarens inhägnad ----------
  // gravkvarter: rektangel r, ev. med mur (7) och 2-3 gluggar; gravstenar i rader inuti
  function stampPlot(G, rng, r, walled) {
    const { W, g } = G, gates = [];
    let ix = r.x, iy = r.y, iw = r.w, ih = r.h;
    if (walled) {
      for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) if (x === r.x || y === r.y || x === r.x + r.w - 1 || y === r.y + r.h - 1) g[y][x] = '7';
      ix++; iy++; iw -= 2; ih -= 2;
      for (const s of rng.shuffle([0, 1, 2, 3]).slice(0, rng.int(2, 3))) {
        const len = s === 0 || s === 2 ? ih : iw, k = rng.int(0, len - 1), two = len >= 4 && rng.chance(0.4);
        for (let j = 0; j < (two ? 2 : 1); j++) {
          const kk = Math.min(len - 1, k + j);
          let x, y;
          if (s === 0) { x = r.x + r.w - 1; y = iy + kk; } else if (s === 2) { x = r.x; y = iy + kk; }
          else if (s === 1) { x = ix + kk; y = r.y + r.h - 1; } else { x = ix + kk; y = r.y; }
          g[y][x] = '.';
          for (const t of [-1, 0, 1]) G.lockMin(x + DX[s] * t, y + DY[s] * t, 1);
          if (!j) gates.push([x + DX[s], y + DY[s]]);
        }
      }
    } else {
      const s = rng.int(0, 3);
      gates.push(s === 0 ? [r.x + r.w, r.y + (r.h >> 1)] : s === 2 ? [r.x - 1, r.y + (r.h >> 1)] : s === 1 ? [r.x + (r.w >> 1), r.y + r.h] : [r.x + (r.w >> 1), r.y - 1]);
    }
    const dirt = rng.chance(0.5);
    for (let y = iy; y < iy + ih; y++) for (let x = ix; x < ix + iw; x++) G.fm[y * W + x] = dirt ? 3 : 0;
    // gravstenar i rader med en gång emellan, glest och lite ojämnt
    const horiz = iw >= ih ? rng.chance(0.75) : rng.chance(0.25);
    const A = horiz ? ih : iw, B = horiz ? iw : ih;
    for (let a = rng.int(0, 1); a < A; a += 2) {
      for (let b = rng.int(0, 1); b < B; b += rng.chance(0.2) ? 3 : 2) {
        if (rng.chance(0.1)) continue;
        plant(G, horiz ? ix + b : ix + a, horiz ? iy + a : iy + b, 'n');
      }
    }
    return { x: ix, y: iy, w: iw, h: ih, gates, walled };
  }

  function buildGraveyard(rng, depth, opts, look, K) {
    const [W, H] = mapSize(rng, depth), N = W * H;
    const G = Grid(W, H, '.', look.wall), { g, fm, lock } = G;
    G.sky.fill(1);
    const rects = [];
    const gapOK = (a, b, gap) => a.x + a.w + gap <= b.x || b.x + b.w + gap <= a.x || a.y + a.h + gap <= b.y || b.y + b.h + gap <= a.y;
    const place = (w, h, gap, z) => { // z = [x0, y0, x1, y1) zon för rektangeln
      z = z || [2, 2, W - 2, H - 2];
      if (z[2] - w < z[0] || z[3] - h < z[1]) return null;
      for (let t = 0; t < 80; t++) {
        const r = { x: rng.int(z[0], z[2] - w), y: rng.int(z[1], z[3] - h), w, h, gap };
        if (rects.every(o => gapOK(o, r, Math.max(gap, o.gap)))) { rects.push(r); return r; }
      }
      return null;
    };
    // ingång vid en av murarna (bestäms först: vaktarens inhägnad hamnar i bortre halvan)
    const side = rng.int(0, 3), along = (L) => rng.int(Math.floor(L / 3), Math.ceil(L * 2 / 3));
    const P = side === 0 ? [W - 2, along(H)] : side === 2 ? [1, along(H)] : side === 1 ? [along(W), H - 2] : [along(W), 1];
    // vaktarens inhägnad: mur i vaktarens väggtecken, öppen himmel, 1-2 dörrar
    const big = W * H >= 1150, gw = rng.int(11, big ? 13 : 11), gh = rng.int(11, big ? 13 : 12);
    const fz = side === 0 ? [2, 2, Math.ceil(W / 2) + 1, H - 2] : side === 2 ? [Math.floor(W / 2) - 1, 2, W - 2, H - 2]
      : side === 1 ? [2, 2, W - 2, Math.ceil(H / 2) + 1] : [2, Math.floor(H / 2) - 1, W - 2, H - 2];
    const grc = place(gw, gh, 3, fz) || place(gw, gh, 3);
    if (!grc) return null;
    const gb = stampBuilding(G, rng, grc, K.wall, K.bossIdx, rng.int(1, 2));
    if (!gb) return null;
    const gcells = [];
    for (let y = gb.y; y < gb.y + gb.h; y++) for (let x = gb.x; x < gb.x + gb.w; x++) { G.sky[y * W + x] = 1; G.res[y * W + x] = 1; gcells.push([x, y]); }
    // kapellet nära mitten
    let cw = rng.int(7, 9), ch = rng.int(8, 10);
    if (rng.chance(0.5)) [cw, ch] = [ch, cw];
    const cr = place(cw, ch, 3, [Math.floor(W * 0.2), Math.floor(H * 0.2), Math.ceil(W * 0.8), Math.ceil(H * 0.8)]) || place(cw, ch, 3);
    if (!cr) return null;
    const chapel = stampBuilding(G, rng, cr, '5', 2, rng.int(1, 2));
    if (!chapel) return null;
    if (chapel.w >= 6 && chapel.h >= 6) { // pelare i långhuset, speglade
      const hz = chapel.w >= chapel.h, L = hz ? chapel.w : chapel.h;
      for (let k = 2; k < L - 2; k += 3) for (const s of [1, (hz ? chapel.h : chapel.w) - 2]) plant(G, chapel.x + (hz ? k : s), chapel.y + (hz ? s : k), '5');
    }
    // kryptor / gravkor
    const crypts = [];
    for (let k = depth >= 3 ? 2 : rng.int(1, 2); k > 0; k--) {
      const r = place(rng.int(5, 6), rng.int(5, 6), 2);
      const c = r && stampBuilding(G, rng, r, rng.chance(0.5) ? '4' : '1', 2, 1);
      if (c) crypts.push(c);
    }
    if (!crypts.length) return null;
    // gravkvarter
    const plots = [];
    for (let k = rng.int(5, 7) + Math.floor((W * H - 900) / 400); k > 0; k--) {
      let r = null;
      for (let t = 0; t < 4 && !r; t++) r = t < 3 ? place(rng.int(6, 11 - 2 * t), rng.int(5, 8 - t), 2) : place(5, 4, 2); // krymper om det är trångt
      if (r) plots.push(Object.assign(stampPlot(G, rng, r, rng.chance(0.55)), { outer: r }));
    }
    // ett litet gravkor med en dörr (kan bli ett valv), efter gravkvarteren så att det inte tränger undan dem
    const tombs = [];
    for (const p of [0.8, 0.4]) if (rng.chance(p)) { const r = place(5, 5, 2), c = r && stampBuilding(G, rng, r, rng.chance(0.5) ? '4' : '1', 2, 1); if (c) tombs.push(c); }
    const inPlot = new Uint8Array(N);
    for (const p of plots) for (let y = p.outer.y; y < p.outer.y + p.outer.h; y++) for (let x = p.outer.x; x < p.outer.x + p.outer.w; x++) inPlot[y * W + x] = 1;
    // levande ljus vid gravarna i en del kvarter
    for (const p of plots) if (rng.chance(0.4)) for (let y = p.y; y < p.y + p.h; y++) for (let x = p.x; x < p.x + p.w; x++) {
      if (g[y][x] !== 'n' || !rng.chance(0.3)) continue;
      const d = rng.int(0, 3), xx = x + DX[d], yy = y + DY[d];
      if (G.inb(xx, yy) && g[yy][xx] === '.' && !lock[yy * W + xx]) g[yy][xx] = 'c';
    }
    // grusgångar från ingången till kapellet och vidare till vaktaren, kryptor och kvarter
    if (g[P[1]][P[0]] !== '.') return null;
    const nz = new Float32Array(N); for (let i = 0; i < N; i++) nz[i] = rng.next();
    const onPath = new Uint8Array(N);
    const pcost = i => { const c = g[(i / W) | 0][i % W]; if (genBlk(c) || isDoorCh(c) || !G.sky[i] || G.res[i]) return Infinity; return onPath[i] ? 0.3 : 1 + nz[i] * 0.8 + (inPlot[i] ? 4 : 0); };
    const gravel = (path, wide) => {
      for (const i of path) {
        const x = i % W, y = (i / W) | 0;
        for (const [xx, yy] of wide ? [[x, y], [x + 1, y], [x, y + 1]] : [[x, y]]) {
          const j = yy * W + xx;
          if (!G.inb(xx, yy) || g[yy][xx] !== '.' || !G.sky[j] || G.res[j] || (inPlot[j] && wide)) continue;
          fm[j] = 1; onPath[j] = 1; G.lockMin(xx, yy, 1);
        }
      }
    };
    onPath[P[1] * W + P[0]] = 1;
    const pois = chapel.doors.map(d => d.out).concat(gb.doors.map(d => d.out));
    for (const c of crypts.concat(tombs)) pois.push(c.doors[0].out);
    for (const p of plots) for (const gt of p.gates) if (G.inb(gt[0], gt[1]) && g[gt[1]][gt[0]] === '.') pois.push(gt);
    let avenue = null;
    for (let k = 0; k < pois.length; k++) {
      const s = pois[k][1] * W + pois[k][0];
      if (onPath[s]) continue;
      const path = dijkstra(G, [s], i => onPath[i] === 1, pcost);
      if (path) { gravel(path, k === 0); if (k === 0) avenue = path; }
    }
    // statyallé längs den breda gången till kapellet
    if (avenue) for (let k = 3; k + 4 < avenue.length; k += 4) {
      const a = avenue[k], b = avenue[k + 1], ax = a % W, ay = (a / W) | 0, px = -(((b / W) | 0) - ay), py = b % W - ax;
      for (const s of [-1, 1]) for (const off of [2, 3]) {
        const ux = ax + px * s * off, uy = ay + py * s * off;
        if (G.inb(ux, uy) && G.sky[uy * W + ux] && !inPlot[uy * W + ux] && plant(G, ux, uy, 'u')) break;
      }
    }
    // döda träd i dungar och gamla gravar på ängen
    const D = fbm(rng, W, H, 6);
    const nearCh = (x, y, c) => { for (let k = 0; k < 8; k++) if (G.at(x + RX[k], y + RY[k]) === c) return true; return false; };
    const order = []; for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) order.push([x, y]);
    for (const [x, y] of rng.shuffle(order)) {
      const i = y * W + x;
      if (g[y][x] !== '.' || lock[i] || inPlot[i] || !G.sky[i] || G.res[i]) continue;
      if (D[i] > 0.62 ? rng.chance(0.22) : rng.chance(0.025)) { if (!nearCh(x, y, 't')) plant(G, x, y, 't'); }
      else if (D[i] < 0.45 && rng.chance(plots.length < 4 ? 0.13 : 0.07) && !nearCh(x, y, 'n')) plant(G, x, y, 'n');
      else if (D[i] < 0.3 && rng.chance(0.02)) { // en kort rad gamla gravar
        const h = rng.chance(0.5);
        for (let k = rng.int(2, 4) - 1; k >= 0; k--) { const xx = x + (h ? 2 * k : 0), yy = y + (h ? 0 : 2 * k); if (G.inb(xx, yy) && !inPlot[yy * W + xx]) plant(G, xx, yy, 'n'); }
      }
    }
    // inga gläntor bredare än ~11 rutor: träd eller en liten gravrad där det är som öppnast
    breakOpen(G, rng, 6, (x, y) => {
      if (rng.chance(0.55)) { plantNear(G, rng, x, y, 't', 1); return; }
      const h = rng.chance(0.5);
      for (const k of [-2, 0, 2]) plant(G, x + (h ? k : 0), y + (h ? 0 : k), 'n');
    });
    if (!connectRegions(G, rng, { mainAt: P, width: 1 })) return null; // säkerhetsnät, ska inte behöva gräva
    { let nn = 0; for (const row of g) for (const c of row) if (c === 'n') nn++; if (nn < 16) return null; } // gravfältet ska ha gravar
    const seeds = [{ x: chapel.cx, y: chapel.cy, tag: 'chapel', box: chapel }];
    for (const c of crypts) seeds.push({ x: c.cx, y: c.cy, tag: 'crypt', box: c });
    for (const c of tombs) seeds.push({ x: c.cx, y: c.cy, tag: 'tomb', box: c });
    return populate(G, rng, depth, opts, { biome: 'graveyard', gid: K.id, floors: K.floors, guardian: { cells: gcells, center: [gb.cx, gb.cy], doors: gb.doors.map(d => d.out) },
      P, seeds, areaCells: 120, treasureTags: ['crypt'], extraChest: 0.5, eliteTags: ['chapel', 'open'], barrels: { p: 0.25, min: 2, tags: ['chapel', 'crypt'] }, vaultWall: look.wall });
  }

  // ---------- Skog: brusmask, slingrande huvudstig, slinga, gläntor och vaktarens palissad ----------
  function buildForest(rng, depth, opts, look, K) {
    const [W, H] = mapSize(rng, depth), N = W * H, wc = look.wall;
    const G = Grid(W, H, wc), { g, fm, lock } = G;
    G.sky.fill(1);
    const D = fbm(rng, W, H, rng.range(5, 7)), M = fbm(rng, W, H, 4);
    const nz = new Float32Array(N); for (let i = 0; i < N; i++) nz[i] = rng.next();
    // glesa partier är öppna, täta blir skogsbryn
    const T = rng.range(0.4, 0.48);
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) if (D[y * W + x] < T) g[y][x] = '.';
    const pid = new Int16Array(N), clr = new Uint8Array(N); // pid: vilken stig rutan tillhör (1 huvud, 2 slinga, 3+ sidostigar, 90 vaktaren)
    const cost = own => i => G.solid[i] || G.res[i] ? Infinity : (g[(i / W) | 0][i % W] === '.' ? 1 : 2 + 3 * D[i]) + 0.6 * nz[i] + (own && own(i) ? 6 : 0);
    const carve = (path, w, id) => {
      for (const i of path) {
        const x = i % W, y = (i / W) | 0;
        for (let dy = 0; dy < w; dy++) for (let dx = 0; dx < w; dx++) {
          const xx = x + dx, yy = y + dy, j = yy * W + xx;
          if (!G.inb(xx, yy) || G.solid[j] || G.res[j]) continue;
          g[yy][xx] = '.'; fm[j] = 1; G.lockMin(xx, yy, 1); if (!pid[j]) pid[j] = id;
        }
      }
    };
    const route = (pts, own) => {
      let out = [];
      for (let k = 0; k + 1 < pts.length; k++) {
        const b = pts[k + 1], p = dijkstra(G, [pts[k]], i => i === b, cost(own));
        if (!p) return null;
        out = out.concat(k ? p.slice(1) : p);
      }
      return out;
    };
    // start och mål vid motsatta kanter, brytpunkter växelvis åt sidorna så att stigen slingrar
    const horiz = rng.chance(W >= H ? 0.6 : 0.4), L = horiz ? W : H, S2 = horiz ? H : W;
    const at = (a, b) => horiz ? b * W + a : a * W + b; // (längs, tvärs) -> index
    const aS = rng.int(2, 3), aE = L - 1 - rng.int(2, 3), nW = L >= 36 ? 3 : 2, up = rng.chance(0.5);
    const pts = [at(aS, rng.int(3, S2 - 4))];
    for (let k = 1; k <= nW; k++) {
      const a = Math.round(aS + (aE - aS) * k / (nW + 1)) + rng.int(-2, 2);
      const b = ((k & 1) === 1) === up ? rng.int(3, Math.floor(S2 * 0.38)) : rng.int(Math.ceil(S2 * 0.62), S2 - 4);
      pts.push(at(a, b));
    }
    pts.push(at(aE, rng.int(3, S2 - 4)));
    if (rng.chance(0.5)) pts.reverse();
    const main = route(pts);
    if (!main) return null;
    carve(main, 2, 1);
    // slinga: en andra väg mellan två punkter på huvudstigen, på andra sidan om den
    {
      const A = main[Math.floor(main.length * rng.range(0.15, 0.3))], B = main[Math.floor(main.length * rng.range(0.65, 0.85))];
      const ab = i => horiz ? [i % W, (i / W) | 0] : [(i / W) | 0, i % W];
      const [a1, b1] = ab(A), [a2, b2] = ab(B), bm = (b1 + b2) / 2;
      const bw = Math.max(3, Math.min(S2 - 4, Math.round(bm + (bm < S2 / 2 ? 1 : -1) * rng.int(6, 9))));
      const near = new Uint8Array(N); // huvudstigen med två rutors marginal: slingan ska inte gå bredvid den
      for (const i of main) { const x = i % W, y = (i / W) | 0; for (let dy = -2; dy <= 3; dy++) for (let dx = -2; dx <= 3; dx++) if (G.inb(x + dx, y + dy)) near[(y + dy) * W + x + dx] = 1; }
      const alt = route([A, at(Math.round((a1 + a2) / 2), bw), B], i => near[i] === 1);
      if (!alt) return null;
      carve(alt, 2, 2);
    }
    // avstånd till stigarna
    const pd = new Int16Array(N).fill(-1), qq = [];
    for (let i = 0; i < N; i++) if (pid[i]) { pd[i] = 0; qq.push(i); }
    for (let qh = 0; qh < qq.length; qh++) {
      const cur = qq[qh], x = cur % W, y = (cur / W) | 0;
      for (let d = 0; d < 4; d++) { const nx = x + DX[d], ny = y + DY[d], ni = ny * W + nx; if (G.inb(nx, ny) && pd[ni] < 0) { pd[ni] = pd[cur] + 1; qq.push(ni); } }
    }
    const S = [main[0] % W, (main[0] / W) | 0], E = [main[main.length - 1] % W, (main[main.length - 1] / W) | 0];
    // vaktarens palissad: rund glänta i bortre delen av skogen, en bit från stigen, med egen sidostig
    const rad = rng.int(4, 5);
    let gc = [];
    for (const [pmax, sf] of [[rad + 8, 0.45], [rad + 14, 0.3]]) { // helst nära stigen och långt från start, annars lite friare
      for (let y = rad + 3; y <= H - rad - 4; y++) for (let x = rad + 3; x <= W - rad - 4; x++) {
        const i = y * W + x;
        if (pd[i] < rad + 2 || pd[i] > pmax || cheb(x, y, S[0], S[1]) < Math.max(W, H) * sf || cheb(x, y, E[0], E[1]) < rad + 4) continue;
        gc.push([x, y]);
      }
      if (gc.length) break;
    }
    if (!gc.length) return null;
    const [gx, gy] = rng.pick(gc);
    const lair = stampLair(G, rng, gx, gy, rad, K.wall, K.bossIdx, 1);
    for (const [x, y] of lair.cells) clr[y * W + x] = 1;
    const gaps = lairGaps(G, rng, lair, rng.chance(0.4) ? 2 : 1, (x, y) => pd[y * W + x] < 0 ? 99 : pd[y * W + x]);
    if (!gaps.length) return null;
    for (const gp of gaps) {
      const b = dijkstra(G, [gp.out[1] * W + gp.out[0]], i => pid[i] > 0, cost());
      if (!b) return null;
      carve(b, rng.chance(0.5) ? 2 : 1, 90);
    }
    // gläntor vid sidan av stigarna, med sidostigar (ibland två -> fler slingor)
    const clearings = [];
    const nC = rng.int(3, 4) + (depth >= 3 ? 1 : 0);
    for (let t = 0; t < 300 && clearings.length < nC; t++) {
      const x = rng.int(4, W - 5), y = rng.int(4, H - 5), i = y * W + x;
      if (pd[i] < 4 || pd[i] > 10 || clearings.some(c => cheb(c.x, c.y, x, y) < 8) || cheb(x, y, S[0], S[1]) < 6 || cheb(x, y, E[0], E[1]) < 6 || cheb(x, y, gx, gy) < rad + 7) continue;
      clearings.push({ x, y, rx: rng.int(2, 4), ry: rng.int(2, 4), cells: [] });
    }
    let hut = null;
    const hutC = rng.chance(0.55) ? clearings.find(c => c.x >= 5 && c.y >= 5 && c.x <= W - 6 && c.y <= H - 6) : null;
    if (hutC) { hutC.rx = Math.max(hutC.rx, 4); hutC.ry = Math.max(hutC.ry, 4); }
    for (let k = 0; k < clearings.length; k++) {
      const c = clearings[k], id = 3 + k;
      for (let dy = -c.ry - 1; dy <= c.ry + 1; dy++) for (let dx = -c.rx - 1; dx <= c.rx + 1; dx++) {
        const x = c.x + dx, y = c.y + dy, j = y * W + x;
        if (!G.inb(x, y) || G.solid[j] || G.res[j]) continue;
        if ((dx / (c.rx + 0.5)) ** 2 + (dy / (c.ry + 0.5)) ** 2 <= 1 + (nz[j] - 0.5) * 0.5) { g[y][x] = '.'; clr[j] = 1; if (!pid[j]) fm[j] = 3; c.cells.push([x, y]); }
      }
      let from = c.y * W + c.x;
      if (c === hutC) { // en stuga mitt i gläntan, med fri ring runt om
        const r = { x: c.x - 2, y: c.y - 2, w: 5, h: 5 };
        for (let y = r.y - 1; y <= r.y + r.h; y++) for (let x = r.x - 1; x <= r.x + r.w; x++) if (G.inb(x, y) && !G.solid[y * W + x] && !G.res[y * W + x]) { g[y][x] = '.'; clr[y * W + x] = 1; }
        hut = stampBuilding(G, rng, r, '9', 1, 1);
        if (!hut) return null;
        from = hut.doors[0].out[1] * W + hut.doors[0].out[0];
      }
      const b1 = dijkstra(G, [from], i => pid[i] > 0 && pid[i] !== id, cost());
      if (!b1) return null;
      carve(b1, rng.chance(0.5) ? 2 : 1, id);
      if (rng.chance(0.45)) {
        const e = b1[b1.length - 1], ex = e % W, ey = (e / W) | 0;
        const b2 = dijkstra(G, [c.y * W + c.x], i => pid[i] > 0 && pid[i] !== id && cheb(i % W, (i / W) | 0, ex, ey) >= 8, cost(i => pid[i] === id));
        if (b2) carve(b2, 1, id);
      }
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) G.lockMin(c.x + dx, c.y + dy, 1); // gläntans mitt hålls fri
    }
    // isolerade gläntor i bladverket: små fylls, stora får en tunnel
    if (!connectRegions(G, rng, { minSize: 12, fillCh: wc, width: 2, mainAt: S })) return null;
    // enskilda träd: tätare nära skogsbrynet, glest i gläntorna
    const cells = []; for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) cells.push([x, y]);
    for (const [x, y] of rng.shuffle(cells)) {
      const i = y * W + x;
      if (g[y][x] !== '.' || lock[i]) continue;
      let p = Math.max(0.05, Math.min(0.28, 0.05 + (D[i] - T + 0.3) * 0.6));
      if (clr[i]) p *= 0.4;
      if (rng.chance(p)) plant(G, x, y, 't');
    }
    breakOpen(G, rng, 6, (x, y) => { plantNear(G, rng, x, y, 't', 1); if (rng.chance(0.5)) plantNear(G, rng, x + rng.int(-1, 1), y + rng.int(-1, 1), 't', 1); });
    for (let i = 0; i < N; i++) if (fm[i] === 0 && M[i] < 0.22) fm[i] = 2; // lerpölar
    if (!farEnough(G, S, E, [gx, gy])) return null;
    const seeds = clearings.filter(c => c !== hutC).map(c => ({ x: c.x, y: c.y, tag: 'clearing', cells: c.cells.filter(([x, y]) => g[y][x] !== wc) }));
    if (hut) seeds.unshift({ x: hut.cx, y: hut.cy, tag: 'hut', box: hut });
    return populate(G, rng, depth, opts, { biome: 'forest', gid: K.id, floors: K.floors, guardian: { cells: lair.cells, center: [gx, gy], doors: gaps.map(c => c.out) },
      P: S, X: E, seeds, areaCells: 80, treasureTags: ['hut', 'clearing'], eliteTags: ['clearing'],
      barrels: { p: 0.2, min: 2, tags: ['clearing', 'hut'] }, secretWall: wc, secretChance: 0.4, vaultWall: wc });
  }

  // ---------- Borggård: öppen gård omgiven av byggnadslängor; vaktarens hall och en fontän på gården ----------
  function buildCourtyard(rng, depth, opts, look, K) {
    const [W, H] = mapSize(rng, depth), N = W * H;
    const G = Grid(W, H, look.wall, '4'), { g, fm, lock } = G;
    // längornas inre djup per sida (N Ö S V); 0 = bara ringmur
    const th = [rng.int(4, 7), rng.int(4, 7), rng.int(4, 7), rng.int(4, 7)];
    // färre längor (rum) på grunda våningar: varje rum ska ha en hel fiendegrupp
    for (const s of rng.shuffle([0, 1, 2, 3]).slice(0, depth <= 2 ? 2 : depth <= 4 ? 1 : rng.chance(0.5) ? 1 : 0)) th[s] = 0; // bara ringmur
    const span = (a, b, L) => L - 2 - (th[a] ? th[a] + 1 : 0) - (th[b] ? th[b] + 1 : 0);
    for (let k = 0; k < 12 && span(1, 3, W) < 16; k++) { const s = th[1] >= th[3] ? 1 : 3; th[s] = th[s] > 4 ? th[s] - 1 : 0; }
    for (let k = 0; k < 12 && span(0, 2, H) < 16; k++) { const s = th[0] >= th[2] ? 0 : 2; th[s] = th[s] > 4 ? th[s] - 1 : 0; }
    const cx0 = 1 + (th[3] ? th[3] + 1 : 0), cx1 = W - 2 - (th[1] ? th[1] + 1 : 0);
    const cy0 = 1 + (th[0] ? th[0] + 1 : 0), cy1 = H - 2 - (th[2] ? th[2] + 1 : 0);
    const mat = [0, 1, 2, 3].map(() => rng.chance(0.25) ? '9' : look.wall);
    const zone = s => s === 0 ? [1, 1, W - 2, cy0 - 1] : s === 2 ? [1, cy1 + 1, W - 2, H - 2] : s === 3 ? [1, cy0, cx0 - 1, cy1] : [cx1 + 1, cy0, W - 2, cy1];
    for (let s = 0; s < 4; s++) if (th[s]) { const [x0, y0, x1, y1] = zone(s); for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { g[y][x] = mat[s]; G.solid[y * W + x] = 1; } }
    for (let y = cy0; y <= cy1; y++) for (let x = cx0; x <= cx1; x++) { g[y][x] = '.'; G.sky[y * W + x] = 1; G.solid[y * W + x] = 0; }
    // längorna delas i rum (långa salar: färre men större rum)
    const rooms = [], strips = [[], [], [], []];
    const split = (s, a0, a1, b0, b1) => {
      for (let pos = a0; pos <= a1;) {
        const rem = a1 - pos + 1, len = rem <= 15 ? rem : rng.int(8, Math.min(14, rem - 8));
        const r = s % 2 === 0 ? { x: pos, y: b0, w: len, h: b1 - b0 + 1 } : { x: b0, y: pos, w: b1 - b0 + 1, h: len };
        r.side = s; r.id = rooms.length; r.cx = r.x + (r.w >> 1); r.cy = r.y + (r.h >> 1);
        rooms.push(r); strips[s].push(r);
        const wood = mat[s] === '9' || rng.chance(0.3);
        for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) { g[y][x] = '.'; G.solid[y * W + x] = 0; fm[y * W + x] = wood ? 3 : 2; }
        pos += len + 1;
      }
    };
    if (th[0]) split(0, 1, W - 2, 1, th[0]);
    if (th[2]) split(2, 1, W - 2, H - 1 - th[2], H - 2);
    if (th[3]) split(3, cy0, cy1, 1, th[3]);
    if (th[1]) split(1, cy0, cy1, W - 1 - th[1], W - 2);
    // möjliga dörrar: [x, y, insida x, y, utsida x, y] per förbindelse (b = null: gården)
    const links = [];
    for (const st of strips) for (let k = 0; k + 1 < st.length; k++) {
      const r = st[k], q = st[k + 1], cells = [];
      if (r.side % 2 === 0) { const sx = r.x + r.w; for (let y = r.y; y < r.y + r.h; y++) cells.push([sx, y, sx - 1, y, sx + 1, y]); }
      else { const sy = r.y + r.h; for (let x = r.x; x < r.x + r.w; x++) cells.push([x, sy, x, sy - 1, x, sy + 1]); }
      links.push({ a: r, b: q, cells });
    }
    for (const s of [0, 2]) for (const r of strips[s]) {
      const wy = s === 0 ? cy0 - 1 : cy1 + 1, iy = s === 0 ? wy - 1 : wy + 1, oy = s === 0 ? wy + 1 : wy - 1;
      const yard = [], left = [], right = [];
      for (let x = r.x; x < r.x + r.w; x++) {
        const c = [x, wy, x, iy, x, oy];
        if (x >= cx0 && x <= cx1) yard.push(c); else if (th[3] && x <= cx0 - 2) left.push(c); else if (th[1] && x >= cx1 + 2) right.push(c);
      }
      if (yard.length) links.push({ a: r, b: null, cells: yard });
      if (left.length) links.push({ a: r, b: strips[3][s === 0 ? 0 : strips[3].length - 1], cells: left });
      if (right.length) links.push({ a: r, b: strips[1][s === 0 ? 0 : strips[1].length - 1], cells: right });
    }
    for (const s of [1, 3]) for (const r of strips[s]) {
      const wx = s === 3 ? cx0 - 1 : cx1 + 1, ix = s === 3 ? wx - 1 : wx + 1, ox = s === 3 ? wx + 1 : wx - 1, cells = [];
      for (let y = r.y; y < r.y + r.h; y++) cells.push([wx, y, ix, y, ox, y]);
      links.push({ a: r, b: null, cells });
    }
    const par = rooms.map((_, i) => i).concat([rooms.length]);
    const find = i => (par[i] === i ? i : (par[i] = find(par[i])));
    const node = r => (r ? r.id : rooms.length);
    const yardDoors = [];
    const addDoor = L => {
      const ok = L.cells.filter(([x, y, ix, iy, ox, oy]) => {
        if (!isWall(g[y][x]) || g[iy][ix] !== '.' || g[oy][ox] !== '.') return false;
        const fl = ix === ox ? [g[y][x - 1], g[y][x + 1]] : [g[y - 1][x], g[y + 1][x]];
        if (!isWall(fl[0]) || !isWall(fl[1])) return false;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (isDoorCh(g[y + dy][x + dx])) return false;
        return true;
      });
      if (!ok.length) return false;
      const mid = (ok.length - 1) / 2, c = ok.map((v, k) => [v, Math.abs(k - mid) + rng.next() * ok.length * 0.4]).sort((u, v) => u[1] - v[1])[0][0];
      g[c[1]][c[0]] = 'D'; markDoor(G, c[0], c[1], c[4], c[5], c[2], c[3]);
      if (!L.b) yardDoors.push(c);
      par[find(node(L.a))] = find(node(L.b)); L.used = true;
      return true;
    };
    for (const L of rng.shuffle(links)) if (rng.chance(L.b ? 0.6 : 0.5)) addDoor(L);
    for (let it = 0; it < 3; it++) for (const L of links.slice().sort((u, v) => (u.b ? 1 : 0) - (v.b ? 1 : 0))) if (!L.used && find(node(L.a)) !== find(node(L.b))) addDoor(L);
    if (rooms.some(r => find(r.id) !== find(rooms.length))) return null;
    for (const L of links) if (yardDoors.length < 3 && !L.b && !L.used) addDoor(L);
    if (yardDoors.length && rng.chance(0.5)) { const c = rng.pick(yardDoors); g[c[1]][c[0]] = 'G'; } // en järngrind
    // ett förråd i änden av en sal: tvärvägg med en dörr (ett rum med en enda dörr, kan bli ett valv)
    if (rng.chance(0.75)) for (const r of rng.shuffle(rooms.slice())) {
      const alongX = r.side % 2 === 0, len = alongX ? r.w : r.h, dep = alongX ? r.h : r.w, k = 3, end = rng.chance(0.5);
      if (len < 9 || dep < 3) continue;
      const a0 = end ? len - k : 0, wl = end ? len - k - 1 : k, P2 = (a, b) => (alongX ? [r.x + a, r.y + b] : [r.x + b, r.y + a]);
      let ok = true;
      for (let a = end ? wl : -1; ok && a <= (end ? len : k); a++) for (let b = -1; b <= dep; b++) { const [x, y] = P2(a, b); if (isDoorCh(G.at(x, y))) { ok = false; break; } }
      if (!ok) continue;
      for (let b = 0; b < dep; b++) { const [x, y] = P2(wl, b); g[y][x] = mat[r.side]; G.solid[y * W + x] = 1; }
      const [dx, dy] = P2(wl, dep >> 1), [ix, iy] = P2(end ? wl + 1 : wl - 1, dep >> 1), [ox, oy] = P2(end ? wl - 1 : wl + 1, dep >> 1);
      g[dy][dx] = 'D'; markDoor(G, dx, dy, ox, oy, ix, iy);
      const [cx0, cy0] = P2(a0, 0), cl = alongX ? { x: cx0, y: cy0, w: k, h: dep } : { x: cx0, y: cy0, w: dep, h: k };
      if (alongX) { if (!end) r.x += k + 1; r.w -= k + 1; } else { if (!end) r.y += k + 1; r.h -= k + 1; }
      r.cx = r.x + (r.w >> 1); r.cy = r.y + (r.h >> 1);
      Object.assign(cl, { side: r.side, id: rooms.length, cx: cl.x + (cl.w >> 1), cy: cl.y + (cl.h >> 1) });
      rooms.push(cl); strips[r.side].push(cl);
      break;
    }
    // vaktarens hall i ett av gårdens hörn (två rutor gång mot längorna), dörrar mot gårdens mitt
    const cwid = cx1 - cx0 + 1, chei = cy1 - cy0 + 1;
    const hw = Math.min(13, cwid - 4, rng.int(11, 13)), hh = Math.min(13, chei - 4, rng.int(11, 13));
    if (hw < 11 || hh < 11) return null;
    const corner = rng.int(0, 3), hx = corner & 1 ? cx1 - 1 - hw : cx0 + 2, hy = corner & 2 ? cy1 - 1 - hh : cy0 + 2;
    const inSides = [corner & 1 ? 2 : 0, corner & 2 ? 3 : 1];
    const hall = stampBuilding(G, rng, { x: hx, y: hy, w: hw, h: hh }, K.wall, K.bossIdx, rng.int(1, 2), rng.shuffle(inSides).concat(rng.shuffle([0, 1, 2, 3].filter(s => !inSides.includes(s)))));
    if (!hall) return null;
    const gcells = [];
    for (let y = hall.y; y < hall.y + hall.h; y++) for (let x = hall.x; x < hall.x + hall.w; x++) { G.res[y * W + x] = 1; gcells.push([x, y]); }
    for (let y = hy - 1; y <= hy + hh; y++) for (let x = hx - 1; x <= hx + hw; x++) G.res[y * W + x] = 1; // gången runt hallen hålls fri från torn
    // gräsfläckar på gruset
    const Mn = fbm(rng, W, H, 5);
    for (let y = cy0; y <= cy1; y++) for (let x = cx0; x <= cx1; x++) if (G.sky[y * W + x] && Mn[y * W + x] > 0.6) fm[y * W + x] = 1;
    // fontänen: stenlagd plats (5x5) så långt från hallen och gårdskanterna som möjligt
    let fountain = null;
    {
      let bv = -1;
      for (let y = cy0 + 3; y <= cy1 - 3; y++) for (let x = cx0 + 3; x <= cx1 - 3; x++) {
        let ok = true;
        for (let yy = y - 2; ok && yy <= y + 2; yy++) for (let xx = x - 2; xx <= x + 2; xx++) { const i = yy * W + xx; if (g[yy][xx] !== '.' || !G.sky[i] || G.res[i] || lock[i]) { ok = false; break; } }
        if (!ok) continue;
        const dh = Math.max(hx - x, x - (hx + hw - 1), hy - y, y - (hy + hh - 1)), de = Math.min(x - cx0, cx1 - x, y - cy0, cy1 - y);
        const v = Math.min(dh, 2 * de) + rng.next() * 2;
        if (v > bv) { bv = v; fountain = { x: x - 2, y: y - 2, w: 5, h: 5, cx: x, cy: y }; }
      }
      if (fountain) for (let y = fountain.y; y < fountain.y + 5; y++) for (let x = fountain.x; x < fountain.x + 5; x++) { G.res[y * W + x] = 1; fm[y * W + x] = 2; }
    }
    // torn och pelare som skydd, med fri ring runt om
    const towers = [];
    const nT = rng.int(1, 2) + Math.floor(cwid * chei / 260);
    for (let t = 0; t < 150 && towers.length < nT; t++) {
      const s = rng.pick([1, 2, 2, 3]), x = rng.int(cx0 + 2, cx1 - 1 - s), y = rng.int(cy0 + 2, cy1 - 1 - s);
      const r = { x, y, w: s, h: s };
      if (towers.some(o => !(o.x + o.w + 3 <= r.x || r.x + r.w + 3 <= o.x || o.y + o.h + 3 <= r.y || r.y + r.h + 3 <= o.y))) continue;
      let ok = true;
      for (let yy = y - 1; ok && yy <= y + s; yy++) for (let xx = x - 1; xx <= x + s; xx++) {
        const inner = xx >= x && yy >= y && xx < x + s && yy < y + s;
        if (g[yy][xx] !== '.' || !G.sky[yy * W + xx] || G.res[yy * W + xx] || (inner && lock[yy * W + xx])) { ok = false; break; }
      }
      if (!ok) continue;
      const round = s === 3 && rng.chance(0.5);
      for (let yy = y; yy < y + s; yy++) for (let xx = x; xx < x + s; xx++) if (!(round && (xx - x) % 2 === 0 && (yy - y) % 2 === 0)) g[yy][xx] = '4';
      towers.push(r);
    }
    for (let y = cy0; y <= cy1; y++) for (let x = cx0; x <= cx1; x++) if (fm[y * W + x] === 1 && rng.chance(0.06)) plant(G, x, y, 't');
    breakOpen(G, rng, 5, (x, y) => { if (fm[y * W + x] === 1 && rng.chance(0.6)) plantNear(G, rng, x, y, 't', 1); else plantNear(G, rng, x, y, '4', 1); });
    if (!connectRegions(G, rng, { width: 1 })) return null;
    { let nd = 0; for (const row of g) for (const c of row) if (c === 'D' || c === 'G') nd++; if (nd < 6) return null; } // längorna ska ha dörrar
    for (let y = hy - 1; y <= hy + hh; y++) for (let x = hx - 1; x <= hx + hw; x++) if (!(x >= hall.x && y >= hall.y && x < hall.x + hall.w && y < hall.y + hall.h)) G.res[y * W + x] = 0;
    const seeds = rooms.map(r => ({ x: r.cx, y: r.cy, tag: 'room', box: r }));
    if (fountain) seeds.push({ x: fountain.cx, y: fountain.cy, tag: 'fountain', box: fountain });
    return populate(G, rng, depth, opts, { biome: 'courtyard', gid: K.id, floors: K.floors, guardian: { cells: gcells, center: [hall.cx, hall.cy], doors: hall.doors.map(d => d.out) },
      seeds, areaCells: 110, minOpen: depth <= 2 ? 1 : 2, treasureTags: ['room'], eliteTags: ['open', 'room'], shrineTags: ['fountain'], barrels: { p: 0.4, min: 3 }, spikes: rng.int(1, 3), vaultWall: look.wall });
  }

  // gångavstånd: utgången E minst 0.82 x kartans största mått från start S, vaktarens mitt Z minst 0.33 av längsta vägen från S
  function farEnough(G, S, E, Z) {
    const d = bfsG(G, [S]); let mx = 0;
    for (let i = 0; i < d.length; i++) if (d[i] > mx) mx = d[i];
    return d[E[1] * G.W + E[0]] >= 0.82 * Math.max(G.W, G.H) && d[Z[1] * G.W + Z[0]] >= 0.33 * mx;
  }
  // ---------- Träsk: vatten (-) med mossöar, spänger, pålhyddor, döda träd och vaktarens palissad ----------
  // floors: 0 mossa, 1 spänger (plankor), 2 lera, 3 vissnat gräs, 4 vaktarens golv
  function buildSwamp(rng, depth, opts, look, K) {
    const [W, H] = mapSize(rng, depth), N = W * H, wc = look.wall;
    const G = Grid(W, H, '.', wc), { g, fm, lock } = G;
    G.sky.fill(1);
    const D = fbm(rng, W, H, rng.range(4.5, 6.5)), T = fbm(rng, W, H, 4), M = fbm(rng, W, H, 5);
    const nz = new Float32Array(N); for (let i = 0; i < N; i++) nz[i] = rng.next();
    // tjockt, ojämnt snår längs kanten och några täta dungar; vatten i sänkorna, mossa (ibland lera/gräs) på tuvorna
    const wet = [];
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      const i = y * W + x, e = Math.min(x, y, W - 1 - x, H - 1 - y);
      if (e + (T[i] - 0.5) * 6 < 2.6 || (D[i] > 0.9 && T[i] < 0.45)) g[y][x] = wc; else wet.push(D[i]);
    }
    const WT = wet.sort((a, b) => a - b)[Math.floor(wet.length * rng.range(0.48, 0.56))]; // andelen vatten (innan spänger och hyddor)
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      const i = y * W + x;
      if (g[y][x] === wc) continue;
      if (D[i] < WT) g[y][x] = '-'; else fm[i] = M[i] < 0.22 ? 2 : M[i] > 0.84 ? 3 : 0;
    }
    // spänger: huvudstig från kant till kant (slingrar) och en slinga; över vatten och snår blir stigen plankor
    const pid = new Int16Array(N);
    const base = new Float32Array(N);
    for (let i = 0; i < N; i++) { const c = g[(i / W) | 0][i % W]; base[i] = (c === wc ? 5 : c === '-' ? 1.7 : 1) + 0.6 * nz[i]; }
    const cost = own => own ? (i => G.solid[i] || G.res[i] ? Infinity : base[i] + (own(i) ? 6 : 0)) : (i => G.solid[i] || G.res[i] ? Infinity : base[i]);
    const carve = (path, w, id) => {
      for (const i of path) {
        const x = i % W, y = (i / W) | 0;
        for (let dy = 0; dy < w; dy++) for (let dx = 0; dx < w; dx++) {
          const xx = x + dx, yy = y + dy, j = yy * W + xx;
          if (!G.inb(xx, yy) || G.solid[j] || G.res[j]) continue;
          if (g[yy][xx] !== '.') { g[yy][xx] = '.'; fm[j] = 1; base[j] = 1 + 0.6 * nz[j]; } else if (!pid[j] && fm[j] !== 1) fm[j] = 2;
          G.lockMin(xx, yy, 1); if (!pid[j]) pid[j] = id;
        }
      }
    };
    const route = (pts, own) => {
      let out = [];
      for (let k = 0; k + 1 < pts.length; k++) {
        const b = pts[k + 1], p = dijkstra(G, [pts[k]], i => i === b, cost(own));
        if (!p) return null;
        out = out.concat(k ? p.slice(1) : p);
      }
      return out;
    };
    const horiz = rng.chance(W >= H ? 0.8 : 0.2), L = horiz ? W : H, S2 = horiz ? H : W;
    const at = (a, b) => horiz ? b * W + a : a * W + b;
    const aS = rng.int(2, 3), aE = L - 1 - rng.int(2, 3), nW = L >= 36 ? 3 : 2, up = rng.chance(0.5);
    const pts = [at(aS, rng.int(5, S2 - 6))];
    for (let k = 1; k <= nW; k++) {
      const a = Math.round(aS + (aE - aS) * k / (nW + 1)) + rng.int(-2, 2);
      pts.push(at(a, ((k & 1) === 1) === up ? rng.int(5, Math.floor(S2 * 0.38)) : rng.int(Math.ceil(S2 * 0.62), S2 - 6)));
    }
    pts.push(at(aE, rng.int(5, S2 - 6)));
    if (rng.chance(0.5)) pts.reverse();
    const main = route(pts);
    if (!main) return null;
    carve(main, 2, 1);
    {
      const A = main[Math.floor(main.length * rng.range(0.15, 0.3))], B = main[Math.floor(main.length * rng.range(0.65, 0.85))];
      const ab = i => horiz ? [i % W, (i / W) | 0] : [(i / W) | 0, i % W];
      const [a1, b1] = ab(A), [a2, b2] = ab(B), bm = (b1 + b2) / 2;
      const bw = Math.max(5, Math.min(S2 - 6, Math.round(bm + (bm < S2 / 2 ? 1 : -1) * rng.int(6, 9))));
      const near = new Uint8Array(N);
      for (const i of main) { const x = i % W, y = (i / W) | 0; for (let dy = -2; dy <= 3; dy++) for (let dx = -2; dx <= 3; dx++) if (G.inb(x + dx, y + dy)) near[(y + dy) * W + x + dx] = 1; }
      const alt = route([A, at(Math.round((a1 + a2) / 2), bw), B], i => near[i] === 1);
      if (!alt) return null;
      carve(alt, 1, 2);
    }
    const pd = new Int16Array(N).fill(-1), qq = [];
    for (let i = 0; i < N; i++) if (pid[i]) { pd[i] = 0; qq.push(i); }
    for (let qh = 0; qh < qq.length; qh++) {
      const cur = qq[qh], x = cur % W, y = (cur / W) | 0;
      for (let d = 0; d < 4; d++) { const nx = x + DX[d], ny = y + DY[d], ni = ny * W + nx; if (G.inb(nx, ny) && pd[ni] < 0) { pd[ni] = pd[cur] + 1; qq.push(ni); } }
    }
    const S = [main[0] % W, (main[0] / W) | 0], E = [main[main.length - 1] % W, (main[main.length - 1] / W) | 0];
    // vaktarens palissad: rund ö en bit från spången, i bortre delen av träsket
    const rad = rng.int(4, 5);
    let gc = [];
    for (const [pmax, sf, pmin] of [[rad + 8, 0.45, rad + 2], [rad + 14, 0.3, rad + 2], [rad + 30, 0.25, rad + 1]]) {
      for (let y = rad + 3; y <= H - rad - 4; y++) for (let x = rad + 3; x <= W - rad - 4; x++) {
        const i = y * W + x;
        if (pd[i] < pmin || pd[i] > pmax || cheb(x, y, S[0], S[1]) < Math.max(W, H) * sf || cheb(x, y, E[0], E[1]) < rad + 4) continue;
        gc.push([x, y]);
      }
      if (gc.length) break;
    }
    if (!gc.length) return null;
    gc.sort((a, b) => cheb(b[0], b[1], S[0], S[1]) - cheb(a[0], a[1], S[0], S[1])); // helst långt från start
    const [gx, gy] = gc[rng.int(0, Math.max(0, Math.ceil(gc.length * 0.25) - 1))];
    const lair = stampLair(G, rng, gx, gy, rad, K.wall, K.bossIdx, 1);
    const gaps = lairGaps(G, rng, lair, rng.chance(0.4) ? 2 : 1, (x, y) => pd[y * W + x] < 0 ? 99 : pd[y * W + x]);
    if (!gaps.length) return null;
    for (const gp of gaps) {
      const b = dijkstra(G, [gp.out[1] * W + gp.out[0]], i => pid[i] > 0, cost());
      if (!b) return null;
      carve(b, rng.chance(0.5) ? 2 : 1, 90);
    }
    // pålhyddor (timmer eller snår) med en dörr, en brygga runt om och en spång till stigen
    const huts = [];
    const nHut = rng.int(2, 3);
    for (let t = 0; t < 200 && huts.length < nHut; t++) {
      const w = rng.int(5, 6), h = rng.int(5, 6), x = rng.int(3, W - 4 - w), y = rng.int(3, H - 4 - h);
      const cx = x + (w >> 1), cy = y + (h >> 1), ci = cy * W + cx;
      if (pd[ci] < 3 || pd[ci] > 10 || cheb(cx, cy, S[0], S[1]) < 7 || cheb(cx, cy, E[0], E[1]) < 7 || cheb(cx, cy, gx, gy) < rad + 6 || huts.some(o => cheb(o.cx, o.cy, cx, cy) < 8)) continue;
      let ok = true;
      for (let yy = y - 1; ok && yy <= y + h; yy++) for (let xx = x - 1; xx <= x + w; xx++) { const j = yy * W + xx; if (!G.inb(xx, yy) || G.solid[j] || G.res[j] || pid[j]) { ok = false; break; } }
      if (!ok) continue;
      for (let yy = y - 1; yy <= y + h; yy++) for (let xx = x - 1; xx <= x + w; xx++) { g[yy][xx] = '.'; fm[yy * W + xx] = 1; G.lockMin(xx, yy, 1); }
      const b = stampBuilding(G, rng, { x, y, w, h }, rng.chance(0.6) ? '9' : wc, 1, 1);
      if (!b) return null;
      huts.push(b);
      const p = dijkstra(G, [b.doors[0].out[1] * W + b.doors[0].out[0]], i => pid[i] > 0, cost());
      if (p) carve(p, 1, 50 + huts.length);
    }
    // döda träd på tuvorna och ute i vattnet, tätare där det är öppet
    const plantS = (x, y) => {
      const i = y * W + x;
      if (!G.inb(x, y) || lock[i] || G.res[i] || (g[y][x] !== '.' && g[y][x] !== '-') || !localOK(G, x, y)) return false;
      g[y][x] = 't'; return true;
    };
    const cells = []; for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) cells.push([x, y]);
    for (const [x, y] of rng.shuffle(cells)) if (rng.chance(g[y][x] === '.' ? 0.06 : g[y][x] === '-' ? 0.025 : 0)) plantS(x, y);
    breakOpen(G, rng, 6, (x, y) => { for (let k = 0; k < 6; k++) if (plantS(x + rng.int(-1, 1), y + rng.int(-1, 1))) break; });
    if (!connectRegions(G, rng, { minSize: 12, fillCh: wc, width: 2, mainAt: S })) return null;
    // torrt kring start och mål
    for (const [px, py] of [S, E]) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (g[py + dy][px + dx] === '-') { g[py + dy][px + dx] = '.'; fm[(py + dy) * W + px + dx] = 1; }
    // mest vatten, utgången långt bort och vaktaren inte nära start (gångavstånd), annars nytt försök
    if (!farEnough(G, S, E, [gx, gy])) return null;
    { let wet = 0, walk = 0; for (let i = 0; i < N; i++) { const c = g[(i / W) | 0][i % W]; if (!genBlk(c)) { walk++; if (c === '-') wet++; } } if (wet < walk * 0.24) return null; }
    const seeds = huts.map(b => ({ x: b.cx, y: b.cy, tag: 'hut', box: b }));
    return populate(G, rng, depth, opts, { biome: 'swamp', gid: K.id, floors: K.floors, guardian: { cells: lair.cells, center: [gx, gy], doors: gaps.map(c => c.out) },
      P: S, X: E, seeds, areaCells: 85, treasureTags: ['hut'], eliteTags: ['open'], barrels: { p: 0.2, min: 2, tags: ['hut'] },
      secretWall: wc, secretChance: 0.4, vaultWall: wc, spikes: 0 });
  }

  LOOKS.swamp.build = buildSwamp;
  LOOKS.caves.build = buildCaves;
  LOOKS.graveyard.build = buildGraveyard;
  LOOKS.forest.build = buildForest;
  LOOKS.courtyard.build = buildCourtyard;
  LOOKS.crystal.build = buildCaves; // version 8: kristallgrottorna byggs som grottan
  LOOKS.fungus.build = buildCaves; // version 11: svampriket byggs som grottan

  // ---------- Bossarena ----------
  const ARENAS = {
    graveyard: { biome: 'graveyard', wall: '7', floors: ['floor_grass_dead', 'floor_gravel', 'floor_ground_dirt'], ceil: 'floor_stone', outdoor: true, ambient: [0.24, 0.3],
      fog: NIGHT_FOG, names: ['GRAVKUNGENS VILA', 'DE DÖDAS TRÄDGÅRD', 'BENFÄLTET'] },
    cave: { biome: 'caves', wall: '8', floors: ['floor_cave', 'floor_mud'], ceil: 'ceil_cave', outdoor: false, ambient: [0.13, 0.17],
      fog: rng => rng.pick([[16, 8, 8], [10, 12, 14]]), names: ['DRAKENS HÅLA', 'DET DJUPA SVALGET', 'BESTENS LYA'] },
    forest: { biome: 'forest', wall: '6', floors: ['floor_ground_grass', 'floor_ground_dirt', 'floor_grass_dead'], ceil: 'floor_wood_planks', outdoor: true, ambient: [0.25, 0.32],
      fog: NIGHT_FOG, names: ['DEN SVARTA GLÄNTAN', 'HÄXANS RING', 'DE HÄNGDAS EK'] },
    swamp: { biome: 'swamp', wall: '0', floors: ['floor_swamp', 'floor_wood_planks', 'floor_mud'], ceil: 'floor_wood_planks', outdoor: true, ambient: [0.21, 0.27],
      fog: SWAMP_FOG, names: ['DET SJUNKNA ALTARET', 'TRÄSKHÄXANS KÄRR', 'DE DRUNKNADES DJUP'] },
    // ishall: raka väggar av frusen sten, pelare av Ø i speglade par, en frusen sjö (:) i mitten, snödrivor och istappar (Ç)
    frost: { biome: 'frost', wall: 'Ø', floors: ['floor_frost_stone', 'floor_snow'], ceil: 'floor_frost_stone', outdoor: false, ambient: [0.18, 0.23],
      fog: FROST_FOG, names: ['ISTRONENS SAL', 'DEN FRUSNA TRONEN', 'VINTERKUNGENS HALL'] },
    // obsidianhall: raka väggar av Ò, en vallgrav av lava (_) runt den fria mitten med fyra broar, pelare av Ò, askdrivor på golvet
    volcano: { biome: 'volcano', wall: 'Ò', floors: ['floor_basalt', 'floor_ash'], ceil: 'floor_basalt', outdoor: false, ambient: [0.18, 0.24],
      fog: VOLC_FOG, names: ['ASKTRONEN', 'DEN BRINNANDE HALLEN', 'MAGMAHJÄRTAT'] },
    // tempelhall (version 7): pelarrader av sandsten längs väggarna, en sänkt sandgrop i mitten omgiven av en ring av kvicksand (¯)
    // med fyra passager, guldplattor på golvet (floors [0]) och sand i gropen (floors [1])
    tomb: { biome: 'tomb', wall: 'È', floors: ['floor_gold_tiles', 'floor_sand'], ceil: 'floor_sand', outdoor: false, ambient: [0.2, 0.26],
      fog: TOMB_FOG, names: ['FARAONENS TEMPEL', 'SOLGUDENS HALL', 'DEN SJUNKNA HELGEDOMEN'] },
    // kristalltronen (version 8): grottarenans form i kristallvägg Ą med ådror Ć, kristallpelare i speglade par, en ring av brytande
    // kristaller (Ė) runt den fria mitten, glödkristaller Ę i stället för eldfat
    crystal: { biome: 'crystal', wall: 'Ą', floors: ['floor_crystal', 'floor_cave'], ceil: 'ceil_cave', outdoor: false, ambient: [0.12, 0.17],
      fog: CRYSTAL_FOG, names: ['KRISTALLTRONEN', 'DROTTNINGENS GEOD', 'SPEGELSALEN'] },
    // leviatans bassäng (version 8): raka ruinmurar Ċ, en stor bassäng (Đ) i mitten som når fram till bossen, gångar runt om med pelare,
    // korall och statyer, tidvatten (Ĕ) längs stranden och luftbubblor (Ĝ); floors [0] plattor, [1] djupt vatten, [2] tidvatten
    sunken: { biome: 'sunken', wall: 'Ċ', floors: ['floor_sunken_tiles', 'floor_deepwater', 'floor_shallow'], ceil: 'floor_stone', outdoor: true, ambient: [0.18, 0.24],
      fog: SUNKEN_FOG, names: ['LEVIATANS BASSÄNG', 'DEN SJUNKNA TRONEN', 'DJUPETS KATEDRAL'] },
    // urverkshallen (version 9): raka mässingsväggar Ĺ med kuggväggar ĺ, sågspår (Ŀ, level.saws) längs väggarna, två tidsbubblor (ŀ)
    // på var sin sida om den fria mitten, urverk Ņ och mässingspelare i speglade par; inomhus
    clock: { biome: 'clock', wall: 'Ĺ', floors: ['floor_brass'], ceil: 'floor_brass', outdoor: false, ambient: [0.16, 0.22],
      fog: CLOCK_FOG, names: ['URMAKARENS HALL', 'DET STORA URVERKET', 'TIDENS HJÄRTA'] },
    // stormfågelns näste (version 9): en stor ö (molngolv) omgiven av tomrum (Ń), en terrass vid bossen och grinden, startön i söder via
    // en bro, 2-3 speglade par små öar via broar (1-2 breda), blixtstänger ņ, vindbyar (ń, level.winds) på ett par broar; utomhus
    sky: { biome: 'sky', wall: 'Ľ', floors: ['floor_cloud', 'floor_void', 'floor_wind'], ceil: 'floor_cloud', outdoor: true, ambient: [0.26, 0.32],
      fog: SKY_FOG, names: ['STORMFÅGELNS NÄSTE', 'ÅSKANS TRON', 'DEN HÖGSTA TINNEN'] },
    // mycelmoderns grotta (version 11): grottarenans form i svampvägg ŝ med glödande svamphattar Ş, studsplattor (ţ) i speglade par och
    // sporpölar (Ť) utanför den fria mitten, glödsvampar Ŧ i stället för eldfat; floors [0] mossa, [1] grottberg; inomhus
    fungus: { biome: 'fungus', wall: 'ŝ', floors: ['floor_moss', 'floor_cave'], ceil: 'ceil_cave', outdoor: false, ambient: [0.13, 0.18],
      fog: FUNGUS_FOG, names: ['MYCELMODERNS LYA', 'SPORHJÄRTAT', 'DEN STORA RÖTAN'] },
    // spegelkungens sal (version 11): raka marmorväggar Š med spegelväggar š (hela segment, speglade väster/öster och på var sida om P),
    // ett teleporterpar (ť, level.teleports) speglat på var sida om den fria mitten, marmorpelare, spegelpelare och spegelstatyer; inomhus
    mirror: { biome: 'mirror', wall: 'Š', floors: ['floor_marble'], ceil: 'floor_marble', outdoor: false, ambient: [0.2, 0.26],
      fog: MIRROR_FOG, names: ['SPEGELKUNGENS SAL', 'DEN KRISTALLKLARA TRONEN', 'TUSEN SPEGLARS HALL'] },
    // bibliotekariens läsesal (version 13): raka panelväggar Ū med bokhyllor ũ, rader av fristående hyllor (ũ) som skydd i speglade par längs
    // väster- och östsidan, två pulpeter (Ű) speglade utanför den fria mitten, ljuskronor ű i stället för eldfat; floors [0] matta, [1] parkett
    // (längs väggarna); inomhus
    library: { biome: 'library', wall: 'Ū', floors: ['floor_carpet', 'floor_wood_planks'], ceil: 'floor_wood_planks', outdoor: false, ambient: [0.14, 0.2],
      fog: LIBRARY_FOG, names: ['BIBLIOTEKARIENS LÄSESAL', 'DEN FÖRBJUDNA AVDELNINGEN', 'DE TUSEN BÖCKERNAS SAL'] },
    // smideskolossens gjuterihall (version 13): raka plåtväggar ŵ med smältugnar Ŷ, rullband (Ÿ, level.belts) i speglade par längs väster- och
    // östsidan, kanaler med smält metall (Ź) med spänger i sydväst/sydost, ångventiler (ź) och stansar (Ż) i speglade par utanför den fria
    // mitten, städ ż och plåtpelare som skydd; floors [0] järngaller; inomhus
    foundry: { biome: 'foundry', wall: 'ŵ', floors: ['floor_irongrate'], ceil: 'floor_irongrate', outdoor: false, ambient: [0.17, 0.23],
      fog: FOUNDRY_FOG, names: ['SMIDESKOLOSSENS GJUTERIHALL', 'DEN STORA ÄSSJAN', 'JÄRNETS TRON'] },
    // kardinalens kor (version 15): raka väggar av katedralsten Ɗ med blyinfattade fönster Ƌ, bänkrader (Ǝ) i speglade par längs väster- och östsidan,
    // två blodfuntar (Ə) vid norrväggen, pelare, bänkar och statyer som skydd, röd matta från P till grinden; floors [0] marmor, [1] matta; inomhus
    cathedral: { biome: 'cathedral', wall: 'Ɗ', floors: ['floor_cathedral', 'floor_carpet'], ceil: 'floor_stone_pattern', outdoor: false, ambient: [0.14, 0.2],
      fog: CATHEDRAL_FOG, names: ['KARDINALENS KOR', 'BLODMÄSSANS KATEDRAL', 'DEN RÖDA ALTARSALEN'] },
    // bidrottningens kammare (version 15): vaxväggar Ɠ med honungskakor Ɣ och ojämna kanter, honungspölar (Ɩ) och larvsäckar (Ɨ) i speglade par,
    // vaxpelare och honungskakor som skydd; floors [0] vaxgolv; inomhus
    hive: { biome: 'hive', wall: 'Ɠ', floors: ['floor_hivefloor'], ceil: 'floor_hivefloor', outdoor: false, ambient: [0.16, 0.22],
      fog: HIVE_FOG, names: ['BIDROTTNINGENS KAMMARE', 'DEN STORA KAKAN', 'SVÄRMENS HJÄRTA'] },
    // trädgårdsmästarens rabatter (version 16): häckar Ɵ (med trädgårdsmur Ơ) och ojämna kanter under öppen himmel, taggrankor (ƥ) och stenstatyer (ƨ)
    // i speglade par, häckar, träd och statyer som skydd, grusgång från P till grinden; floors [0] gräs, [1] grus, [2] vissnat gräs; utomhus
    garden: { biome: 'garden', wall: 'Ɵ', floors: ['floor_ground_grass', 'floor_garden', 'floor_grass_dead'], ceil: 'floor_wood_planks', outdoor: true, ambient: [0.24, 0.3],
      fog: GARDEN_FOG, names: ['TRÄDGÅRDSMÄSTARENS RABATTER', 'DEN STORA HÄCKEN', 'DE VISSNA ROSORNAS GÅRD'] },
    // Jon Blunds sovkammare (version 16): raka drömväggar Ƣ, glidande väggar (ƣ, level.shifts: 2-3 speglade par lodräta sträckor om 2-3 rutor, en fas
    // per par), sömnens dimma (Ʀ) i speglade fläckar, två falska dörrar (Ʃ) vid väster- och östväggen, drömlyktor ƪ i stället för eldfat, schackbräde
    // (floors [0] drömruta, [1] marmor); inomhus
    dream: { biome: 'dream', wall: 'Ƣ', floors: ['floor_dream', 'floor_marble'], ceil: 'floor_dream', outdoor: false, ambient: [0.15, 0.21],
      fog: DREAM_FOG, names: ['JON BLUNDS SOVKAMMARE', 'MARDRÖMMENS SCHACKBRÄDE', 'DEN EVIGA NATTEN'] },
  };
  // tempelhallens fyra passager över kvicksandsringen (norr vid bossen, söder mot P, väster och öster), 3 rutor breda
  const tombGap = (x, y) => (Math.abs(x - 12) <= 1 && (y <= 11 || y >= 17)) || (Math.abs(y - 14) <= 1 && (x <= 8 || x >= 16));
  // bossens dekor runt arenans kanter (bossen, P, grinden och mitten hålls fria); A: arenans mått
  function bossDecor(G, rng, gid, A) {
    const sp = GUARDIANS[gid], { g, W } = G;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) G.lockMin(A.BX + dx, A.BY + dy, 2);
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { G.lockMin(A.PX + dx, A.PY + dy, 1); G.lockMin(A.cx + dx, A.AY0 + 1 + dy, 1); }
    for (let y = 10; y <= 18; y++) for (let x = A.cx - 4; x <= A.cx + 4; x++) G.lockMin(x, y, 1);
    const cand = [];
    for (let y = A.AY0; y <= A.AY1; y++) for (let x = A.AX0; x <= A.AX1; x++) if (Math.min(x - A.AX0, A.AX1 - x, y - A.AY0, A.AY1 - y) <= 1 && g[y][x] === '.') cand.push([x, y]);
    const list = (sp.decor + sp.decor + sp.light).split('');
    let n = 0;
    for (const [x, y] of rng.shuffle(cand)) {
      if (n >= 10) break;
      if (g[y][x] !== '.' || G.lock[y * W + x]) continue;
      let crowded = false;
      for (let k = 0; k < 8; k++) if (PROP_CHARS.includes(G.at(x + RX[k], y + RY[k])) || G.at(x + RX[k], y + RY[k]) === 'n') crowded = true;
      if (crowded) continue;
      const ch = rng.pick(list);
      if (ch === '²' && G.g.reduce((k, row) => k + row.filter(c => c === '²').length, 0) >= 3) continue; // högst 3 sarkofager (faraonen)
      if (genBlk(ch) ? plant(G, x, y, ch) : (g[y][x] = ch, true)) n++;
    }
  }
  function boss(seed, opts) {
    opts = opts || {};
    const gid = GUARDIANS[opts.boss] ? opts.boss : null;
    if (opts.arena && ARENAS[opts.arena]) return bossArena(seed, opts.arena, opts, gid);
    const rng = RNG(seed).fork('boss');
    const theme = rng.pick(BOSS_THEMES);
    const wc = gid ? GUARDIANS[gid].wall : theme.wall;
    const W = 25, H = 27, cx = 12; // arena: x 1..23 (23 breda), y 4..25 (22 djupa)
    const AX0 = 1, AX1 = 23, AY0 = 4, AY1 = 25;
    const G = Grid(W, H, wc), g = G.g;
    for (let y = AY0; y <= AY1; y++) for (let x = AX0; x <= AX1; x++) g[y][x] = '.';
    for (let y = 1; y <= 2; y++) for (let x = cx - 1; x <= cx + 1; x++) g[y][x] = '.';
    g[1][cx] = 'x';
    g[3][cx] = 'G';
    const PX = cx, PY = AY1 - 1, BX = cx, BY = AY0 + 3;
    // pelare (2x2) speglade i x
    const blocks = [];
    const nPairs = rng.int(2, 3);
    for (let t = 0; t < 60 && blocks.length < nPairs; t++) {
      const x = rng.int(3, 8), y = rng.int(8, 20);
      if (blocks.some(b => Math.abs(b.x - x) < 4 && Math.abs(b.y - y) < 4)) continue;
      blocks.push({ x, y });
    }
    for (const b of blocks) for (const bx of [b.x, 23 - b.x]) for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) g[b.y + dy][bx + dx] = wc;
    // eldfat runt kanterna
    const jit = () => rng.int(-1, 1);
    const spots = [];
    for (const x of [3, 7, 17, 21]) { spots.push([x + jit(), AY0], [x + jit(), AY1]); }
    for (const y of [7, 12, 17, 22]) { spots.push([AX0, y + jit()], [AX1, y + jit()]); }
    for (const [x, y] of spots) {
      if (g[y][x] !== '.' || cheb(x, y, cx, AY0) <= 2 || cheb(x, y, PX, PY) <= 1) continue;
      g[y][x] = 'f';
    }
    g[PY][PX] = 'P';
    g[BY][BX] = 'B';
    const fc = [];
    for (let y = 12; y <= AY1; y++) for (let x = AX0; x <= AX1; x++) if (g[y][x] === '.' && cheb(x, y, PX, PY) >= 2) fc.push([x, y]);
    rng.shuffle(fc);
    const nh = rng.int(3, 4), na = rng.int(3, 4);
    for (let i = 0; i < nh + na && i < fc.length; i++) g[fc[i][1]][fc[i][0]] = i < nh ? 'h' : 'a';
    // bossens tema: golv i bossens textur (med en ram av salens golv längs väggarna) och dekor längs kanterna
    const floors = [theme.floor];
    if (gid) {
      floors.push(GUARDIANS[gid].floor);
      for (let y = AY0 + 1; y < AY1; y++) for (let x = AX0 + 1; x < AX1; x++) G.fm[y * W + x] = 1;
      bossDecor(G, RNG(seed).fork('boss-decor'), gid, { cx, PX, PY, BX, BY, AX0, AX1, AY0, AY1 });
    }
    const level = {
      name: rng.pick(theme.names), biome: 'dungeon', floor: theme.floor, floors, floorMask: rowsOf(W, H, G.fm),
      ceil: theme.ceil, sky: null, secretWall: wc, fog: theme.fog.slice(), ambient: roundAmb(rng, theme.ambient),
      map: g.map(r => r.join('')), depth: opts.depth || 6, seed, arena: 'hall',
      rooms: [{ x: AX0, y: AY0, w: AX1 - AX0 + 1, h: AY1 - AY0 + 1, type: 'boss' }, { x: cx - 1, y: 1, w: 3, h: 2, type: 'exit' }], saws: [], winds: [], teleports: [], belts: [], arenas: [], shifts: [],
    };
    if (gid) level.boss = gid;
    level.features = features(level.map);
    return level;
  }

  // arenor utomhus/i grottan: samma grundform som tronsalen (P nere, B uppe, grind G och utgång x bakom),
  // skydd i speglade par runt kanterna men en fri mitt (9x9) där den stora bossen kan röra sig.
  // Med en boss (gid) görs arenans inre väggar (skydd, kantväxt, bakväggen) i bossens väggtecken och mitten får bossens golv.
  function bossArena(seed, arena, opts, gid) {
    const A = ARENAS[arena], root = RNG(seed).fork('boss-' + arena);
    const W = 25, H = 27, cx = 12, AX0 = 1, AX1 = 23, AY0 = 4, AY1 = 25, wc = A.wall, ic = gid ? GUARDIANS[gid].wall : wc;
    const PX = cx, PY = AY1 - 1, BX = cx, BY = AY0 + 3;
    const mid = (x, y) => x >= cx - 4 && x <= cx + 4 && y >= 10 && y <= 18;
    const lrng = root.fork('look'), name = lrng.pick(A.names), fog = A.fog(lrng), ambient = roundAmb(lrng, A.ambient);
    const tide = arena === 'sunken' ? { period: lrng.int(24, 40) } : null; // version 8: tidvattnets period
    for (let attempt = 0; attempt < 20; attempt++) {
      const rng = root.fork('a' + attempt);
      const G = Grid(W, H, wc), { g, fm } = G;
      for (let y = AY0; y <= AY1; y++) for (let x = AX0; x <= AX1; x++) { g[y][x] = '.'; G.sky[y * W + x] = A.outdoor ? 1 : 0; }
      for (let y = 1; y <= 2; y++) for (let x = cx - 1; x <= cx + 1; x++) { g[y][x] = '.'; G.sky[y * W + x] = arena === 'forest' || arena === 'swamp' || arena === 'sunken' || arena === 'sky' || arena === 'garden' ? 1 : 0; }
      g[1][cx] = 'x'; g[3][cx] = 'G';
      markDoor(G, cx, 3, cx, 4, cx, 2);
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) G.lockMin(BX + dx, BY + dy, 1); // bossen är stor
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) G.lockMin(PX + dx, PY + dy, 1);
      for (let y = 10; y <= 18; y++) for (let x = cx - 4; x <= cx + 4; x++) G.lockMin(x, y, 1);
      if (arena === 'sunken') { // stor bassäng (ojämn ellips) i mitten som når fram till bossen; tidvatten längs stranden, luftbubblor
        const NB = fbm(rng, W, H, 3);
        for (let y = 8; y <= 21; y++) for (let x = 4; x <= 20; x++) {
          const e = Math.sqrt(((x - cx) / 6.6) ** 2 + ((y - 14.5) / 6.2) ** 2) + (NB[y * W + x] - 0.5) * 0.18;
          if (e <= 1 && cheb(x, y, PX, PY) > 3) g[y][x] = 'Đ';
        }
        g[BY + 1][BX] = 'Đ'; g[BY + 2][BX] = 'Đ'; // vattnet når fram till bossen (precis söder om B)
        const sh = [];
        for (let y = AY0; y <= AY1; y++) for (let x = AX0; x <= AX1; x++)
          if (g[y][x] === '.' && [0, 1, 2, 3].some(d => g[y + DY[d]][x + DX[d]] === 'Đ') && cheb(x, y, PX, PY) > 2 && cheb(x, y, BX, BY) > 1) sh.push([x, y]);
        for (const [x, y] of rng.shuffle(sh)) if (rng.chance(0.7) && localOK(G, x, y)) g[y][x] = 'Ĕ';
        const inner = [], bub = [], nB = rng.int(2, 3);
        for (let y = AY0; y <= AY1; y++) for (let x = AX0; x <= AX1; x++) if (g[y][x] === 'Đ' && cheb(x, y, BX, BY) > 2 && [0, 1, 2, 3].every(d => g[y + DY[d]][x + DX[d]] === 'Đ')) inner.push([x, y]);
        for (const [x, y] of rng.shuffle(inner)) { if (bub.length >= nB) break; if (bub.some(p => cheb(p[0], p[1], x, y) < 4)) continue; g[y][x] = 'Ĝ'; bub.push([x, y]); }
      }
      if (arena === 'volcano') { // vallgrav: ring (2 rutor bred) mellan mitten och väggarna, broar i norr (bred, vid bossen), söder, väster och öster
        const NM = fbm(rng, W, H, 3);
        const bridge = (x, y) => (y <= 9 && x >= cx - 2 && x <= cx + 2) || (y >= 20 && x >= cx - 1 && x <= cx + 1) || ((x <= 6 || x >= 18) && y >= 13 && y <= 15);
        for (let y = 7; y <= 22; y++) for (let x = 4; x <= 20; x++) {
          const ring = !(x >= 7 && x <= 17 && y >= 10 && y <= 19) && x >= 5 && x <= 19 && y >= 8 && y <= 21;
          if (bridge(x, y)) G.lockMin(x, y, 1); // broarna och deras yttre landningar hålls fria
          if (!ring || bridge(x, y) || ((x === 5 || x === 19) && (y === 8 || y === 21))) continue;
          if ((x === 5 || x === 19 || y === 8 || y === 21) && NM[y * W + x] < 0.22) continue; // ojämn ytterkant
          g[y][x] = '_';
        }
        for (let k = -1; k <= 1; k++) { G.lockMin(7, 14 + k, 1); G.lockMin(17, 14 + k, 1); G.lockMin(cx + k, 19, 1); } // inre landningar
      }
      if (arena === 'tomb') { // sandgrop: ellipsring (ca 2 rutor bred) av kvicksand runt mitten, passager i norr, söder, väster och öster
        const NM = fbm(rng, W, H, 3);
        for (let y = 7; y <= 21; y++) for (let x = 4; x <= 20; x++) {
          const e = Math.sqrt(((x - cx) / 6.2) ** 2 + ((y - 14) / 5.2) ** 2);
          if (tombGap(x, y)) { G.lockMin(x, y, 1); continue; } // passagerna hålls fria
          if (e < 0.6 || e > 1) continue;
          if ((e < 0.66 || e > 0.94) && NM[y * W + x] < 0.3) continue; // ojämna kanter
          g[y][x] = '¯';
        }
      }
      const saws = [], winds = [];
      if (arena === 'clock') { // sågspår längs väggarna (speglade par: väster/öster, söder och ibland norr) och två tidsbubblor
        const track = (x0, y0, dx, dy, len) => {
          const cells = [];
          for (let k = 0; k < len; k++) {
            const x = x0 + dx * k, y = y0 + dy * k;
            if (g[y][x] !== '.' || G.lock[y * W + x] || cheb(x, y, PX, PY) <= 2 || cheb(x, y, BX, BY) <= 2 || cheb(x, y, cx, AY0) <= 2 || !localOK(G, x, y)) break;
            g[y][x] = 'Ŀ'; cells.push([x, y]);
          }
          if (cells.length >= 3) { const z = cells[cells.length - 1]; saws.push({ x0: cells[0][0], y0: cells[0][1], x1: z[0], y1: z[1] }); return true; }
          for (const [x, y] of cells) g[y][x] = '.';
          return false;
        };
        const ly = rng.int(7, 11), ll = rng.int(5, 7), sl = rng.int(4, 6), sx0 = rng.int(3, 4);
        track(AX0, ly, 0, 1, ll); track(AX1, ly, 0, 1, ll); // väster och öster
        const ly2 = rng.int(15, 17), ll2 = rng.int(4, 6);
        track(AX0, ly2, 0, 1, ll2); track(AX1, ly2, 0, 1, ll2);
        track(sx0, AY1, 1, 0, sl); track(W - 1 - sx0, AY1, -1, 0, sl); // söder, på var sida om P
        if (rng.chance(0.5)) { const nl = rng.int(3, 5); track(AX0 + 1, AY0, 1, 0, nl); track(AX1 - 1, AY0, -1, 0, nl); } // norr, en bit från bossen
        if (saws.length < 4) continue;
        const by = rng.int(12, 16), bx = rng.int(4, 6);
        for (const x of [bx, W - 1 - bx]) { if (g[by][x] !== '.' || !localOK(G, x, by)) continue; g[by][x] = 'ŀ'; }
        if ([...g[by]].filter(c => c === 'ŀ').length !== 2) continue;
        for (const x of [bx, W - 1 - bx]) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) G.lockMin(x + dx, by + dy, 1); // fritt runt bubblorna
      }
      if (arena === 'sky') { // öar över tomrummet: stor ö i mitten, terrass vid bossen, startön i söder, små öar i speglade par via broar
        const NI = fbm(rng, W, H, 3), rx = rng.range(6.8, 7.4), ry = rng.range(6.0, 6.5), isl = new Uint8Array(W * H);
        const mark = (x, y) => { if (x >= AX0 && x <= AX1 && y >= AY0 && y <= AY1) isl[y * W + x] = 1; };
        for (let y = AY0; y <= AY1; y++) for (let x = AX0; x <= AX1; x++) {
          const e = Math.sqrt(((x - cx) / rx) ** 2 + ((y - 14.5) / ry) ** 2) + (NI[y * W + x] - 0.5) * 0.22;
          if (e <= 1 || mid(x, y)) mark(x, y);
        }
        for (let y = AY0; y <= 9; y++) for (let x = cx - 3; x <= cx + 3; x++) mark(x, y); // terrassen vid bossen och grinden
        for (let y = AY1 - 2; y <= AY1; y++) for (let x = cx - 3; x <= cx + 3; x++) mark(x, y); // startön
        const bw = rng.chance(0.5) ? 2 : 1;
        for (let y = 19; y <= AY1 - 2; y++) for (let x = cx; x < cx + bw; x++) mark(x, y); // bron till startön
        // små öar (2-3 speglade par) med broar in mot den stora ön
        const spots = rng.shuffle([[3, 6, 0], [3, 20, 0], [2, 14, 0]]).slice(0, rng.int(2, 3)), small = [];
        for (const [ix, iy] of spots) {
          const r = rng.range(1.3, 1.9), w2 = rng.chance(0.5) ? 2 : 1;
          for (const sx of [ix, W - 1 - ix]) {
            for (let y = iy - 2; y <= iy + 2; y++) for (let x = sx - 2; x <= sx + 2; x++) if (Math.hypot(x - sx, y - iy) <= r + 0.15) mark(x, y);
            const dir = sx < cx ? 1 : -1, cells = [];
            for (let x = sx + dir; x !== cx; x += dir) { // bron: rakt in mot mitten tills den når den stora ön
              if (isl[iy * W + x] && Math.abs(x - sx) > 2) break;
              for (let t = 0; t < w2; t++) if (!isl[(iy + t) * W + x]) { mark(x, iy + t); cells.push([x, iy + t]); }
            }
            small.push({ sx, iy, dir, cells });
          }
        }
        for (let y = AY0; y <= AY1; y++) for (let x = AX0; x <= AX1; x++) if (!isl[y * W + x]) g[y][x] = 'Ń';
        // vindbyar på ett par broar (om de är minst 2 rutor långa): vinden blåser in mot den stora ön
        const wp = small.filter(s => s.cells.length >= 2);
        if (wp.length >= 2 && rng.chance(0.75)) {
          const k = rng.int(0, (wp.length >> 1) - 1) * 2;
          for (const s of [wp[k], wp[k + 1]]) for (const [x, y] of s.cells) {
            if (g[y][x] !== '.' || isBlock(G.at(x + s.dir, y))) continue;
            g[y][x] = 'ń'; winds.push({ x, y, dx: s.dir, dy: 0 });
          }
        }
      }
      const teleports = [];
      if (arena === 'mirror') { // spegelväggar: hela segment längs väster- och östväggen (speglade) och södra väggen på var sida om P; ett teleporterpar
        const segs = [[0, rng.int(5, 7), 0, 1, rng.int(5, 7)], [0, rng.int(14, 16), 0, 1, rng.int(5, 7)], [rng.int(2, 3), H - 1, 1, 0, rng.int(5, 7)]];
        for (const [x0, y0, dx, dy, len] of segs) for (let k = 0; k < len; k++) for (const x of [x0 + dx * k, W - 1 - x0 - dx * k]) {
          const y = y0 + dy * k;
          if (y >= 4 && y <= H - 1 && cheb(x, y, cx, 3) > 2 && cheb(x, y, PX, PY) > 3 && g[y][x] === wc) g[y][x] = 'š';
        }
        const ty = rng.int(12, 16), tx = rng.int(3, 5);
        for (const x of [tx, W - 1 - tx]) { if (g[ty][x] !== '.' || !localOK(G, x, ty)) break; g[ty][x] = 'ť'; }
        if (g[ty][tx] !== 'ť' || g[ty][W - 1 - tx] !== 'ť') continue;
        teleports.push({ a: { x: tx, y: ty }, b: { x: W - 1 - tx, y: ty } });
        for (const x of [tx, W - 1 - tx]) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) G.lockMin(x + dx, ty + dy, 1); // fritt runt teleportrarna
      }
      if (arena === 'fungus') { // studsplattor i speglade par utanför mitten (väster/öster, och ibland vid P:s sida), sporpölar i speglade fläckar
        const pads = [[rng.int(4, 6), rng.int(11, 13)], [rng.int(3, 5), rng.int(19, 21)]];
        let np = 0;
        for (const [px0, py0] of pads) for (const x of [px0, W - 1 - px0]) {
          if (g[py0][x] !== '.' || G.lock[py0 * W + x] || cheb(x, py0, PX, PY) <= 2 || !localOK(G, x, py0)) continue;
          g[py0][x] = 'ţ'; np++;
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) G.lockMin(x + dx, py0 + dy, 1);
        }
        if (np < 2) continue;
        const NS = fbm(rng, W, H, 3);
        let ns = 0;
        for (let t = 0; t < 40 && ns < 3; t++) { // 2-3 speglade fläckar om 2-5 rutor
          const sx = rng.int(2, 7), sy = rng.int(6, 23), want = rng.int(2, 5), cells = [];
          if (mid(sx, sy) || mid(W - 1 - sx, sy)) continue;
          for (let k = 0; k < 9 && cells.length < want; k++) {
            const x = sx + (k % 3) - 1, y = sy + ((k / 3) | 0) - 1;
            if (NS[y * W + x] < 0.35 && cells.length) continue;
            const ok = xx => g[y][xx] === '.' && !G.lock[y * W + xx] && !mid(xx, y) && cheb(xx, y, PX, PY) > 2 && cheb(xx, y, BX, BY) > 2 && cheb(xx, y, cx, 3) > 2
              && !RX.some((ddx, q) => 'ţ'.includes(G.at(xx + ddx, y + RY[q]))) && localOK(G, xx, y);
            if (!ok(x) || !ok(W - 1 - x)) continue;
            g[y][x] = 'Ť'; g[y][W - 1 - x] = 'Ť'; cells.push([x, y]);
          }
          if (cells.length >= 2) ns++; else for (const [x, y] of cells) { g[y][x] = '.'; g[y][W - 1 - x] = '.'; }
        }
        if (ns < 2) continue;
      }
      const belts = [], shifts = [];
      if (arena === 'library') { // läsesal: hyllrader i speglade par längs väster- och östsidan (skydd), två pulpeter speglade utanför mitten
        const rows = [], nR = rng.int(3, 4);
        for (let t = 0; t < 60 && rows.length < nR; t++) {
          const y = rng.int(6, 22), x0 = rng.int(1, 3), len = rng.int(3, 4);
          if (rows.some(ry => Math.abs(ry - y) < 3) || cheb(x0, y, PX, PY) <= 3) continue;
          let n = 0;
          for (let k = 0; k < len; k++) { const x = x0 + k; if (mid(x, y) || mid(W - 1 - x, y)) break; if (plant(G, x, y, 'ũ')) { if (plant(G, W - 1 - x, y, 'ũ')) n++; else { g[y][x] = '.'; break; } } else break; }
          if (n >= 2) rows.push(y);
        }
        if (rows.length < 2) continue;
        const ly = rng.int(19, 22), lx = rng.int(4, 6);
        for (const x of [lx, W - 1 - lx]) { if (!plant(G, x, ly, 'Ű')) break; }
        if (g[ly][lx] !== 'Ű' || g[ly][W - 1 - lx] !== 'Ű') continue;
        for (const x of [lx, W - 1 - lx]) for (let d = 0; d < 4; d++) G.lockMin(x + DX[d], ly + DY[d], 1); // fri framsida
      }
      if (arena === 'foundry') { // gjuterihall: rullband, kanaler, stansar och ångventiler i speglade par utanför mitten
        const free = (x, y) => G.inb(x, y) && g[y][x] === '.' && !G.lock[y * W + x] && !mid(x, y) && cheb(x, y, PX, PY) > 2 && cheb(x, y, BX, BY) > 2 && cheb(x, y, cx, AY0) > 2;
        const lay = (x0, y0, dx, dy, len) => { // ett rakt band; rutan efter slutet hålls fri (lock)
          const ex = x0 + dx * len, ey = y0 + dy * len;
          for (let k = 0; k < len; k++) if (!free(x0 + dx * k, y0 + dy * k)) return false;
          if (!G.inb(ex, ey) || g[ey][ex] !== '.') return false;
          for (let k = 0; k < len; k++) { const x = x0 + dx * k, y = y0 + dy * k; g[y][x] = 'Ÿ'; belts.push({ x, y, dx, dy }); }
          G.lockMin(ex, ey, 1);
          return true;
        };
        // lodräta band (x 2-3, y 6-12): det västra går söderut, det östra norrut
        const bx = rng.int(2, 3), by0 = rng.int(6, 7), bl = rng.int(5, 6);
        if (!lay(bx, by0, 0, 1, bl) || !lay(W - 1 - bx, by0 + bl - 1, 0, -1, bl)) continue;
        // kanaler med smält metall (y 19-22, x 1-6, 1-2 breda) med en spång; varje ruta med localOK
        const cy0 = rng.int(19, 21), wide = rng.chance(0.5) ? 2 : 1, brx = rng.int(2, 4);
        let nc = 0;
        for (let y = cy0; y < cy0 + wide; y++) for (let x = 1; x <= 6; x++) {
          if (x === brx) continue;
          for (const xx of [x, W - 1 - x]) {
            if (!free(xx, y) || RX.some((ddx, q) => G.at(xx + ddx, y + RY[q]) === 'Ÿ') || !localOK(G, xx, y)) continue;
            g[y][xx] = 'Ź'; nc++;
          }
        }
        if (nc < 6) continue;
        // stansar: ett speglat par (x 5-7, y 6-9)
        const sx = rng.int(5, 7), sy = rng.int(6, 9);
        for (const x of [sx, W - 1 - sx]) { if (!free(x, sy) || RX.some((ddx, q) => 'ŸŹ'.includes(G.at(x + ddx, sy + RY[q]))) || !plant(G, x, sy, 'Ż')) break; }
        if (g[sy][sx] !== 'Ż' || g[sy][W - 1 - sx] !== 'Ż') continue;
        // ångventiler: 1-2 speglade par (x 4-7, y 12-17), inte intill band, kanaler eller varandra
        let nv = 0;
        for (let t = 0; t < 30 && nv < 2; t++) {
          const vx = rng.int(4, 7), vy = rng.int(12, 17);
          const okV = x => free(x, vy) && !RX.some((ddx, q) => 'ŸŹźŻ'.includes(G.at(x + ddx, vy + RY[q]))) && localOK(G, x, vy);
          if (!okV(vx) || !okV(W - 1 - vx)) continue;
          g[vy][vx] = 'ź'; g[vy][W - 1 - vx] = 'ź'; nv++;
        }
        if (!nv) continue;
      }
      const N2 = fbm(rng, W, H, 4);
      // ojämna kanter: berg/bryn växer in från väggen (inte i kyrkogårdens raka mur)
      if (arena !== 'graveyard' && arena !== 'frost' && arena !== 'volcano' && arena !== 'tomb' && arena !== 'sunken' && arena !== 'clock' && arena !== 'sky' && arena !== 'mirror'
        && arena !== 'library' && arena !== 'foundry' && arena !== 'cathedral' && arena !== 'dream') { // (version 15/16: kupan och trädgården får ojämna kanter)
        for (let y = AY0; y <= AY1; y++) for (let x = AX0; x <= AX1; x++) {
          const e = Math.min(x - AX0, AX1 - x, y - AY0, AY1 - y), v = N2[y * W + x];
          if ((e === 0 && v > 0.3) || (e === 1 && v > 0.6) || (e === 2 && v > 0.85)) plant(G, x, y, ic);
        }
      }
      // kristalltronen: en ring av brytande kristaller runt den fria mitten (6-8 st, fri från bossen, P och mitten)
      if (arena === 'crystal') {
        let n = 0;
        for (let k = 0; k < 8; k++) { const a = (k + 0.5) * Math.PI / 4; if (plantNear(G, rng, Math.round(cx + 7 * Math.cos(a)), Math.round(14 + 6 * Math.sin(a)), 'Ė', 1)) n++; }
        if (n < 6) continue;
      }
      // version 15/16: katedralens kor, bidrottningens kammare, trädgårdsmästarens rabatter och Jon Blunds sovkammare (allt i speglade par, utanför den
      // fria mitten och minst tre rutor från P, bossen och grinden)
      const away = (x, y) => !mid(x, y) && cheb(x, y, PX, PY) > 2 && cheb(x, y, BX, BY) > 2 && cheb(x, y, cx, AY0) > 2;
      const free2 = (x, y) => G.inb(x, y) && g[y][x] === '.' && !G.lock[y * W + x] && away(x, y);
      // speglade fläckar (honung, taggrankor, dimma): want fläckar om 2-5 rutor; sink: aldrig enda vägen (localOK)
      const mirrorPatches = (ch, want, sink) => {
        let ns = 0;
        for (let t = 0; t < 40 && ns < want; t++) {
          const sx = rng.int(2, 8), sy = rng.int(6, 23), size = rng.int(2, 5), cells = [];
          for (let k = 0; k < 9 && cells.length < size; k++) {
            const x = sx + (k % 3) - 1, y = sy + ((k / 3) | 0) - 1;
            const ok = xx => free2(xx, y) && !RX.some((ddx, q) => { const c = G.at(xx + ddx, y + RY[q]); return HAZARD.includes(c) && c !== ch; }) && (!sink || localOK(G, xx, y));
            if (!ok(x) || !ok(W - 1 - x) || x === W - 1 - x) continue;
            g[y][x] = ch; g[y][W - 1 - x] = ch; cells.push([x, y]);
          }
          if (cells.length >= 2) ns++; else for (const [x, y] of cells) { g[y][x] = '.'; g[y][W - 1 - x] = '.'; }
        }
        return ns;
      };
      // speglade par av ett hinder (plant: aldrig enda vägen); pred: extra villkor
      const mirrorPair = (x, y, ch, pred) => {
        if (x === W - 1 - x || !free2(x, y) || !free2(W - 1 - x, y) || (pred && (!pred(x, y) || !pred(W - 1 - x, y)))) return false;
        if (!plant(G, x, y, ch)) return false;
        if (!plant(G, W - 1 - x, y, ch)) { g[y][x] = '.'; return false; }
        return true;
      };
      if (arena === 'cathedral') { // bänkrader längs väster- och östsidan (skydd), två blodfuntar vid norrväggen
        const rows = [], nR = rng.int(3, 4);
        for (let t = 0; t < 60 && rows.length < nR; t++) {
          const y = rng.int(6, 22), x0 = rng.int(2, 3), len = rng.int(2, 3);
          if (rows.some(ry => Math.abs(ry - y) < 2)) continue;
          let n = 0;
          for (let k = 0; k < len; k++) { if (mirrorPair(x0 + k, y, 'Ǝ')) n++; else break; }
          if (n >= 2) rows.push(y); else for (let k = 0; k < n; k++) { g[y][x0 + k] = '.'; g[y][W - 1 - x0 - k] = '.'; }
        }
        if (rows.length < 2) continue;
        const fx = rng.int(3, 6), fy = rng.int(6, 8);
        if (!mirrorPair(fx, fy, 'Ə')) continue;
        for (const x of [fx, W - 1 - fx]) for (let d = 0; d < 4; d++) G.lockMin(x + DX[d], fy + DY[d], 1); // fri framsida
      }
      if (arena === 'hive') { // honungspölar och larvsäckar i speglade par
        if (mirrorPatches('Ɩ', rng.int(2, 3), true) < 2) continue;
        let ns = 0;
        for (let t = 0; t < 30 && ns < 2; t++) if (mirrorPair(rng.int(2, 7), rng.int(7, 22), 'Ɨ')) ns++;
        if (!ns) continue;
      }
      if (arena === 'garden') { // taggrankor och stenstatyer i speglade par
        if (mirrorPatches('ƥ', rng.int(2, 3), true) < 2) continue;
        let ns = 0;
        for (let t = 0; t < 30 && ns < 2; t++) if (mirrorPair(rng.int(3, 8), rng.int(7, 22), 'ƨ')) ns++;
        if (!ns) continue;
      }
      if (arena === 'dream') { // glidande väggar (2-3 rutor, lodräta, ett speglat par per fas), sömnens dimma, två falska dörrar vid väster- och östväggen
        let np = 0;
        for (let t = 0; t < 50 && np < 3; t++) {
          const x = rng.int(3, 8), y0 = rng.int(6, 20), len = rng.int(2, 3), ph = rng.int(0, 39) / 10, cells = [];
          for (let k = 0; k < len; k++) {
            const y = y0 + k, xs = [x, W - 1 - x];
            if (!xs.every(xx => free2(xx, y) && !RX.some((ddx, q) => isDoorCh(G.at(xx + ddx, y + RY[q])) || (G.at(xx + ddx, y + RY[q]) === SHIFT16 && ddx !== 0)))) break;
            if (!plant(G, x, y, SHIFT16)) break;
            if (!plant(G, W - 1 - x, y, SHIFT16)) { g[y][x] = '.'; break; }
            cells.push([x, y]);
          }
          if (cells.length < 2) { for (const [xx, y] of cells) { g[y][xx] = '.'; g[y][W - 1 - xx] = '.'; } continue; }
          for (const [xx, y] of cells) { shifts.push({ x: xx, y, ph }); shifts.push({ x: W - 1 - xx, y, ph }); }
          np++;
        }
        if (np < 2) continue;
        if (mirrorPatches('Ʀ', 2, false) < 1) continue;
        const dy = rng.int(12, 17);
        if (!mirrorPair(AX0, dy, 'Ʃ', (x, y) => [0, 1, 2, 3].some(d => isWall(G.at(x + DX[d], y + DY[d]))))) continue;
        for (const x of [AX0, AX1]) for (let d = 0; d < 4; d++) G.lockMin(x + DX[d], dy + DY[d], 1); // fri framsida
      }
      // skydd i speglade par
      const covers = [];
      const nPairs = rng.int(4, 6);
      for (let t = 0; t < 120 && covers.length < nPairs; t++) {
        const x = rng.int(3, 9), y = rng.int(7, 22);
        if (mid(x, y) || covers.some(c => cheb(c[0], c[1], x, y) < 4)) continue;
        const kind = rng.next();
        const cellsK = arena === 'graveyard' ? (kind < 0.45 ? [[0, 0, 'n'], [2, 0, 'n'], [4, 0, 'n']] : kind < 0.75 ? [[0, 0, 't']] : [[0, 0, ic], [1, 0, ic]])
          : arena === 'cave' || arena === 'crystal' ? (kind < 0.6 ? [[0, 0, ic], [1, 0, ic], [0, 1, ic], [1, 1, ic]].filter(() => rng.chance(0.85)) : [[0, 0, ic]])
            : arena === 'fungus' ? (kind < 0.45 ? [[0, 0, ic], [1, 0, ic], [0, 1, ic], [1, 1, ic]].filter(() => rng.chance(0.85)) : kind < 0.75 ? [[0, 0, 'Ş']] : [[0, 0, 'Ŧ']]) // svampstjälkar, svamphattar, glödsvampar
            : arena === 'mirror' ? (kind < 0.4 ? [[0, 0, ic], [1, 0, ic], [0, 1, ic], [1, 1, ic]] : kind < 0.7 ? [[0, 0, 'š']] : [[0, 0, 'ŧ']]) // marmorpelare, spegelpelare, spegelstatyer
            : arena === 'library' ? (kind < 0.45 ? [[0, 0, 'ũ'], [0, 1, 'ũ']] : kind < 0.75 ? [[0, 0, 'q']] : [[0, 0, 'u']]) // korta hyllor, bokhyllor (rekvisita), statyer
            : arena === 'foundry' ? (kind < 0.4 ? [[0, 0, ic], [1, 0, ic], [0, 1, ic], [1, 1, ic]] : kind < 0.75 ? [[0, 0, 'ż']] : [[0, 0, 'Ŷ']]) // plåtpelare, städ, smältugnar
            : arena === 'cathedral' ? (kind < 0.45 ? [[0, 0, ic], [1, 0, ic], [0, 1, ic], [1, 1, ic]] : kind < 0.75 ? [[0, 0, 'Ǝ'], [1, 0, 'Ǝ']] : [[0, 0, 'u']]) // pelare, bänkar, statyer
            : arena === 'hive' ? (kind < 0.55 ? [[0, 0, ic], [1, 0, ic], [0, 1, ic], [1, 1, ic]].filter(() => rng.chance(0.85)) : kind < 0.8 ? [[0, 0, 'Ɣ']] : [[0, 0, 'Ɨ']]) // vaxpelare, honungskakor, larvsäckar
            : arena === 'garden' ? (kind < 0.45 ? [[0, 0, ic], [1, 0, ic]] : kind < 0.75 ? [[0, 0, 't']] : [[0, 0, 'ƨ']]) // häckar, träd, stenstatyer
            : arena === 'dream' ? (kind < 0.5 ? [[0, 0, ic], [1, 0, ic], [0, 1, ic], [1, 1, ic]] : [[0, 0, 'u']]) // drömpelare, statyer
            : arena === 'sunken' ? (kind < 0.45 ? [[0, 0, ic], [1, 0, ic], [0, 1, ic], [1, 1, ic]] : kind < 0.75 ? [[0, 0, 'Č']] : [[0, 0, 'u']]) // ruinpelare, korall, statyer
            : arena === 'clock' ? (kind < 0.45 ? [[0, 0, ic], [1, 0, ic], [0, 1, ic], [1, 1, ic]] : kind < 0.75 ? [[0, 0, 'Ņ']] : [[0, 0, 'ĺ'], [1, 0, 'ĺ']]) // mässingspelare, urverk, kuggväggar
            : arena === 'sky' ? (kind < 0.4 ? [[0, 0, 'ļ']] : kind < 0.7 ? [[0, 0, 'Ľ'], [1, 0, 'Ľ']] : [[0, 0, 'u']]) // molnstenspelare, låga stormmurar, statyer
            : arena === 'swamp' ? (kind < 0.5 ? [[0, 0, 't']] : kind < 0.8 ? [[0, 0, 't'], [1, 1, 't']] : [[0, 0, ic], [1, 0, ic]]) // döda träd och vasstuvor
              : arena === 'frost' ? (kind < 0.6 ? [[0, 0, 'Ø'], [1, 0, 'Ø'], [0, 1, 'Ø'], [1, 1, 'Ø']] : kind < 0.85 ? [[0, 0, 'Ø']] : [[0, 0, 'u']]) // ispelare och statyer
              : arena === 'volcano' ? (kind < 0.6 ? [[0, 0, 'Ò'], [1, 0, 'Ò'], [0, 1, 'Ò'], [1, 1, 'Ò']] : kind < 0.85 ? [[0, 0, 'Ò']] : [[0, 0, 'u']]) // obsidianpelare
              : arena === 'tomb' ? (kind < 0.5 ? [[0, 0, ic], [1, 0, ic], [0, 1, ic], [1, 1, ic]] : kind < 0.8 ? [[0, 0, ic]] : [[0, 0, 'u']]) // sandstenspelare, statyer
              : (kind < 0.5 ? [[0, 0, 't'], [1, 1, 't']] : kind < 0.8 ? [[0, 0, 't']] : [[0, 0, ic], [1, 0, ic], [0, 1, ic], [1, 1, ic]]);
        let n = 0;
        for (const [dx, dy, ch] of cellsK) for (const xx of [x + dx, W - 1 - x - dx]) if (plant(G, xx, y + dy, ch)) n++;
        if (n) covers.push([x, y]);
      }
      // tempelhallen: pelarrader (kolonnad) längs väggarna, och två sarkofager utan bosstema
      if (arena === 'tomb') {
        for (let y = 7; y <= 22; y += 3) for (const x of [3, 21]) plant(G, x, y, ic);
        if (!gid) for (const y of rng.shuffle([8, 11, 17, 20]).slice(0, 1)) for (const x of [1, 23]) plant(G, x, y, '²');
      }
      // strödda gravstenar / träd / droppstenar
      const loose = arena === 'graveyard' ? 'n' : arena === 'forest' || arena === 'swamp' ? 't' : arena === 'frost' ? 'i' : arena === 'volcano' ? (rng.chance(0.5) ? 'i' : 'Ò')
        : arena === 'tomb' ? (rng.chance(0.5) ? 'u' : ic) : arena === 'crystal' ? 'i' : arena === 'sunken' ? (rng.chance(0.5) ? 'u' : 'Č')
          : arena === 'clock' ? (rng.chance(0.5) ? 'Ņ' : 'ĺ') : arena === 'sky' ? (rng.chance(0.5) ? 'ņ' : 'ļ')
            : arena === 'fungus' ? (rng.chance(0.5) ? 'F' : 'Ş') : arena === 'mirror' ? (rng.chance(0.5) ? 'ŧ' : 'u')
              : arena === 'library' ? (rng.chance(0.5) ? 'q' : 'c') : arena === 'foundry' ? (rng.chance(0.5) ? 'ż' : 'T')
                : arena === 'cathedral' ? (rng.chance(0.5) ? 'c' : 'Ǝ') : arena === 'hive' ? (rng.chance(0.5) ? 'j' : 'T') : arena === 'garden' ? (rng.chance(0.5) ? 't' : 'ƨ')
                  : arena === 'dream' ? (rng.chance(0.5) ? 'u' : 'k') : ic; // ishallen: glödande iskristaller
      for (let k = rng.int(5, 9); k > 0; k--) { const x = rng.int(2, 22), y = rng.int(6, 23); if (!mid(x, y)) plant(G, x, y, loose); }
      // eldfat runt kanterna
      const jit = () => rng.int(-1, 1), spots = [];
      if (arena === 'sky') { // stormfågelns näste: eldfat runt den stora öns kant, blixtstänger vid kanten (speglade par)
        for (let k = 0; k < 8; k++) { const a = (k + 0.5) * Math.PI / 4; spots.push([Math.round(cx + 5.8 * Math.cos(a)), Math.round(14.5 + 5.2 * Math.sin(a))]); }
        let nr = 0;
        for (let t = 0; t < 40 && nr < 4; t++) {
          const x = rng.int(3, 9), y = rng.int(6, 22);
          if (!RX.some((dx, k) => G.at(x + dx, y + RY[k]) === 'Ń') || G.at(W - 1 - x, y) !== '.') continue;
          if (plant(G, x, y, 'ņ')) { if (plant(G, W - 1 - x, y, 'ņ')) nr += 2; else g[y][x] = '.'; }
        }
        if (nr < 2) continue;
      } else {
        for (const x of [3, 7, 17, 21]) spots.push([x + jit(), AY0 + 1], [x + jit(), AY1 - 1]);
        for (const y of [7, 12, 17, 22]) spots.push([AX0 + 1, y + jit()], [AX1 - 1, y + jit()]);
      }
      let nf = 0;
      for (const [x, y] of spots) if (cheb(x, y, cx, AY0) > 2 && cheb(x, y, PX, PY) > 2 && plantNear(G, rng, x, y, 'f', arena === 'sky' ? 1 : 2)) nf++;
      if (nf < 6) continue;
      g[PY][PX] = 'P'; g[BY][BX] = 'B';
      const fc = [];
      for (let y = 12; y <= AY1; y++) for (let x = AX0; x <= AX1; x++) if (g[y][x] === '.' && G.lock[y * W + x] < 2 && cheb(x, y, PX, PY) >= 2) fc.push([x, y]);
      rng.shuffle(fc);
      const nh = rng.int(3, 4), na = rng.int(3, 4);
      for (let i = 0; i < nh + na && i < fc.length; i++) g[fc[i][1]][fc[i][0]] = i < nh ? 'h' : 'a';
      // golv: grus-/jordstig från start till grinden, annars lera eller vissnat gräs i fläckar
      const hall = arena === 'cave' || arena === 'frost' || arena === 'volcano' || arena === 'tomb' || arena === 'crystal' || arena === 'fungus'; // ingen stig; mycelmoderns grotta: berg (floors[1]); grottan: lera, ishallen: snödrivor, obsidianhallen: aska, tempelhallen: sand, kristalltronen: berg (floors[1])
      const wetA = arena === 'sunken'; // leviatans bassäng: golven följer vattnet
      const plainA = arena === 'clock' || arena === 'sky' || arena === 'mirror' || arena === 'library' || arena === 'foundry' || arena === 'cathedral' || arena === 'hive' || arena === 'dream'; // (version 15/16: kor, kammare och sovkammare) spegelkungens sal: marmor överallt; urverkshallen: mässing överallt; stormfågelns näste: moln, tomrum och vind
      for (let y = 2; y <= AY1; y++) for (let x = cx - 1; x <= cx + 1; x++) if (!hall && !wetA && !plainA && (x === cx || N2[y * W + x] > 0.4)) fm[y * W + x] = 1;
      for (let i = 0; i < W * H; i++) if (!wetA && !plainA && !fm[i] && N2[i] < 0.3) fm[i] = hall ? 1 : 2;
      if (arena === 'sky') for (let i = 0; i < W * H; i++) { const c = g[(i / W) | 0][i % W]; if (c === 'Ń') fm[i] = 1; else if (c === 'ń') fm[i] = 2; }
      if (arena === 'library') for (let y = AY0; y <= AY1; y++) for (let x = AX0; x <= AX1; x++) if (Math.min(x - AX0, AX1 - x, y - AY0, AY1 - y) <= 1) fm[y * W + x] = 1; // parkett längs väggarna
      if (arena === 'cathedral') for (let y = 2; y <= AY1; y++) for (let x = cx - 1; x <= cx + 1; x++) fm[y * W + x] = 1; // röd matta från P till grinden
      if (arena === 'dream') for (let y = AY0; y <= AY1; y++) for (let x = AX0; x <= AX1; x++) if ((x + y) & 1) fm[y * W + x] = 1; // schackbräde
      if (wetA) for (let i = 0; i < W * H; i++) { const c = g[(i / W) | 0][i % W]; if (c === 'Đ' || c === 'Ĝ') fm[i] = 1; else if (c === 'Ĕ') fm[i] = 2; }
      if (arena === 'volcano') for (let i = 0; i < W * H; i++) if (g[(i / W) | 0][i % W] === '_') fm[i] = 0;
      if (arena === 'tomb') for (let y = 7; y <= 21; y++) for (let x = 4; x <= 20; x++) if (((x - cx) / 6.2) ** 2 + ((y - 14) / 5.2) ** 2 <= 1.02) fm[y * W + x] = 1; // gropen och ringen: sand
      if (arena === 'swamp') { // vattenkanaler och gölar runt öarna; spången i mitten, P, bossen och grinden står torrt
        const N3 = fbm(rng, W, H, 5);
        for (let y = AY0; y <= AY1; y++) for (let x = AX0; x <= AX1; x++) {
          const i = y * W + x, v = N3[i];
          if (g[y][x] !== '.' || G.lock[i] > 1 || x === cx || cheb(x, y, PX, PY) <= 1 || cheb(x, y, BX, BY) <= 2 || y <= AY0) continue;
          if (Math.abs(v - 0.5) < 0.07 || v < 0.16) { g[y][x] = '-'; fm[i] = 0; }
        }
      }
      if (arena === 'frost') { // frusen sjö i mitten (ojämn ellips), P, bossen och grinden står på stengolv; istappar längs väggarna
        const N3 = fbm(rng, W, H, 4), rx = rng.range(4.2, 5.6), ry = rng.range(3.3, 4.4);
        for (let y = AY0; y <= AY1; y++) for (let x = AX0; x <= AX1; x++) {
          if (g[y][x] !== '.' || cheb(x, y, PX, PY) <= 2 || cheb(x, y, BX, BY) <= 2) continue;
          if (((x - cx) / rx) ** 2 + ((y - 14.5) / ry) ** 2 <= 1 + (N3[y * W + x] - 0.5) * 0.7) { g[y][x] = ':'; fm[y * W + x] = 0; }
        }
        const ic2 = [];
        for (let y = AY0; y <= AY1; y++) for (let x = AX0; x <= AX1; x++) {
          const e = Math.min(x - AX0, AX1 - x, y - AY0, AY1 - y);
          if (e <= 1 && g[y][x] === '.' && !G.lock[y * W + x] && cheb(x, y, PX, PY) > 2 && cheb(x, y, BX, BY) > 2 && cheb(x, y, cx, AY0) > 2) ic2.push([x, y]);
        }
        const done = [], nIc = rng.int(4, 6);
        for (const [x, y] of rng.shuffle(ic2)) { if (done.length >= nIc) break; if (done.some(p => cheb(p[0], p[1], x, y) < 3)) continue; g[y][x] = 'Ç'; done.push([x, y]); }
      }
      const floors = A.floors.slice();
      if (gid) {
        // bossens golv i en cirkel kring arenans mitt (hela grottan), bakväggen i bossens väggtecken, dekor längs kanterna
        floors.push(GUARDIANS[gid].floor);
        const rr = arena === 'cave' || arena === 'crystal' || arena === 'fungus' ? 7.5 : wetA ? 9.5 : 5.5, bi = floors.length - 1;
        for (let y = AY0; y <= AY1; y++) for (let x = AX0; x <= AX1; x++) if (Math.hypot(x - cx, y - 14) <= rr && !(wetA && WATER8.includes(g[y][x])) && g[y][x] !== 'Ń' && g[y][x] !== 'ń') fm[y * W + x] = bi;
        if (wetA) fm[BY * W + BX] = bi; // leviatans bassäng: bossens golv på gångarna runt vattnet och där bossen står
        for (let y = 1; y <= 3; y++) for (let x = 1; x <= W - 2; x++) if (g[y][x] === wc) g[y][x] = ic;
        bossDecor(G, root.fork('decor' + attempt), gid, { cx, PX, PY, BX, BY, AX0, AX1, AY0, AY1 });
      }
      // kristalltronen: glödkristaller i stället för eldfat och kristallådror; leviatans bassäng: korall i murarna; urverkshallen: kuggväggar
      if (arena === 'crystal' || arena === 'sunken' || arena === 'clock' || arena === 'fungus' || arena === 'library' || arena === 'foundry'
        || arena === 'cathedral' || arena === 'hive' || arena === 'garden' || arena === 'dream') { // mycelmoderns grotta: glödsvampar och svamphattar
        // (version 13: läsesalen får bokhyllor i panelväggarna och ljuskronor i stället för eldfat, gjuterihallen smältugnar i plåtväggarna)
        // (version 15/16: koret får blyinfattade fönster, kammaren honungskakor, rabatterna trädgårdsmur i häcken och sovkammaren drömlyktor)
        const vr = root.fork('veins' + attempt), from = arena === 'crystal' ? 'Ą' : arena === 'clock' ? 'Ĺ' : arena === 'fungus' ? 'ŝ' : arena === 'library' ? 'Ū' : arena === 'foundry' ? 'ŵ'
          : arena === 'cathedral' ? 'Ɗ' : arena === 'hive' ? 'Ɠ' : arena === 'garden' ? 'Ɵ' : arena === 'dream' ? 'Ƣ' : 'Ċ';
        const to = arena === 'crystal' ? 'Ć' : arena === 'clock' ? 'ĺ' : arena === 'fungus' ? 'Ş' : arena === 'library' ? 'ũ' : arena === 'foundry' ? 'Ŷ'
          : arena === 'cathedral' ? 'Ƌ' : arena === 'hive' ? 'Ɣ' : arena === 'garden' ? 'Ơ' : arena === 'dream' ? 'Ƣ' : 'Č', faces = [];
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
          if (arena === 'crystal' && g[y][x] === 'f') g[y][x] = 'Ę';
          if (arena === 'fungus' && g[y][x] === 'f') g[y][x] = 'Ŧ';
          if (arena === 'library' && g[y][x] === 'f') g[y][x] = 'ű';
          if (arena === 'dream' && g[y][x] === 'f') g[y][x] = 'ƪ';
          if (g[y][x] === from && [0, 1, 2, 3].some(d => !isWall(G.at(x + DX[d], y + DY[d])))) faces.push([x, y]);
        }
        let nv = 0;
        const pv = arena === 'foundry' ? 0.12 : arena === 'library' || arena === 'hive' ? 0.3 : arena === 'cathedral' ? 0.25 : 0.2;
        for (const [x, y] of faces) if (vr.chance(pv)) { g[y][x] = to; nv++; }
        if (!nv && faces.length) { const [x, y] = vr.pick(faces); g[y][x] = to; }
      }
      const level = {
        name, biome: A.biome, floor: floors[0], floors, floorMask: rowsOf(W, H, fm), ceil: A.ceil, sky: A.outdoor ? rowsOf(W, H, G.sky) : null,
        secretWall: wc, fog, ambient, map: g.map(r => r.join('')), depth: opts.depth || 6, seed, arena,
        rooms: [{ x: AX0, y: AY0, w: AX1 - AX0 + 1, h: AY1 - AY0 + 1, type: 'boss' }, { x: cx - 1, y: 1, w: 3, h: 2, type: 'exit' }],
        tide: tide ? { period: tide.period } : null, saws, winds, teleports, belts, arenas: [], shifts,
      };
      if (gid) level.boss = gid;
      level.features = features(level.map);
      if (!validate(level).length) return level;
    }
    throw new Error('Gen.boss: kunde inte bygga arenan ' + arena + ' (seed ' + seed + ')');
  }

  // ---------- Hemlig skattvåning (Gen.secret) ----------
  // 2-4 rum i rad, förbundna av korta korridorer med dörrar: startrummet (P), skattrum (kistor, guld, eliter) och sist utgångsrummet
  // (x, också med skatter). Inomhus (sky null); utseendet (väggtecken, golv, tak, namn) efter opts.biome.
  const SECRET_LOOKS = {
    dungeon: { wall: '4', floors: ['floor_stone_pattern', 'floor_tiles_blue'], ceil: 'floor_stone', names: ['DEN GLÖMDA SKATTKAMMAREN', 'KUNGENS GÖMMA', 'DE DÖDAS SKATTVALV'] },
    caves: { wall: '8', floors: ['floor_cave', 'floor_mud'], ceil: 'ceil_cave', names: ['GULDGROTTAN', 'DVÄRGARNAS GÖMMA', 'DEN GLITTRANDE GROTTAN'] },
    graveyard: { wall: '3', floors: ['floor_stone_pattern', 'floor_stone'], ceil: 'floor_stone', names: ['DEN RIKES GRAV', 'GULDKRYPTAN'] },
    forest: { wall: '9', floors: ['floor_wood_planks', 'floor_ground_dirt'], ceil: 'floor_wood_planks', names: ['RÖVARNÄSTET', 'HÄXANS SKATTKAMMARE'] },
    courtyard: { wall: '1', floors: ['floor_stone', 'floor_wood_planks'], ceil: 'floor_wood_planks', names: ['SKATTKAMMAREN', 'KUNGENS VALV'] },
    swamp: { wall: '9', floors: ['floor_wood_planks', 'floor_mud'], ceil: 'floor_wood_planks', names: ['SMUGGLARNAS KÄLLARE', 'DEN SJUNKNA SKATTEN'] },
    frost: { wall: 'Ø', floors: ['floor_frost_stone', 'floor_snow'], ceil: 'floor_frost_stone', names: ['DEN FRUSNA SKATTEN', 'ISKUNGENS GÖMMA'] },
    volcano: { wall: 'Ò', floors: ['floor_basalt', 'floor_ash'], ceil: 'floor_basalt', names: ['GULDSMEDJAN', 'DEN SMÄLTA SKATTEN', 'DRAKENS GULDHÖG'] },
    tomb: { wall: 'Ì', floors: ['floor_sand', 'floor_gold_tiles'], ceil: 'floor_sand', names: ['FARAONENS SKATTKAMMARE', 'DEN GYLLENE GRAVEN', 'SOLKUNGENS GÖMMA'] },
    crystal: { wall: 'Ą', floors: ['floor_crystal', 'floor_cave'], ceil: 'ceil_cave', names: ['KRISTALLSKATTEN', 'GEODENS HJÄRTA', 'DEN GLITTRANDE GÖMMAN'] },
    sunken: { wall: 'Ċ', floors: ['floor_sunken_tiles', 'floor_wood_planks'], ceil: 'floor_stone', names: ['VRAKETS LASTRUM', 'DEN SJUNKNA SKATTKAMMAREN', 'PIRATERNAS GÖMMA'] },
    clock: { wall: 'Ĺ', floors: ['floor_brass', 'floor_gold_tiles'], ceil: 'floor_brass', names: ['URMAKARENS SKATTKAMMARE', 'DET GYLLENE URVERKET', 'TIDENS GÖMMA'] }, // version 9
    sky: { wall: 'ļ', floors: ['floor_cloud', 'floor_gold_tiles'], ceil: 'floor_cloud', names: ['MOLNSKATTEN', 'STORMFÅGELNS BO', 'DEN SVÄVANDE SKATTKAMMAREN'] }, // version 9
    fungus: { wall: 'ŝ', floors: ['floor_moss', 'floor_cave'], ceil: 'ceil_cave', names: ['SPORVALVET', 'DEN GLÖDANDE GÖMMAN', 'MYCELETS SKATTKAMMARE'] }, // version 11
    mirror: { wall: 'Š', floors: ['floor_marble', 'floor_gold_tiles'], ceil: 'floor_marble', names: ['SPEGELKUNGENS SKATTKAMMARE', 'DEN FÖRGYLLDA SPEGELN', 'GLASVALVET'] }, // version 11
    library: { wall: 'Ū', floors: ['floor_carpet', 'floor_wood_planks'], ceil: 'floor_wood_planks', names: ['DET FÖRBJUDNA VALVET', 'DE SÄLLSYNTA BÖCKERNAS KAMMARE', 'BIBLIOTEKARIENS GÖMMA'] }, // version 13
    foundry: { wall: 'ŵ', floors: ['floor_irongrate', 'floor_gold_tiles'], ceil: 'floor_irongrate', names: ['GJUTERIETS SKATTKAMMARE', 'DET GYLLENE GJUTVALVET', 'SMIDESKOLOSSENS GÖMMA'] },
    cathedral: { wall: 'Ɗ', floors: ['floor_cathedral', 'floor_gold_tiles'], ceil: 'floor_stone_pattern', names: ['RELIKKAMMAREN', 'KARDINALENS SKATTKAMMARE', 'DET HELIGA VALVET'] }, // version 15
    hive: { wall: 'Ɠ', floors: ['floor_hivefloor', 'floor_gold_tiles'], ceil: 'floor_hivefloor', names: ['HONUNGSFÖRRÅDET', 'DROTTNINGENS SKATTCELL', 'DEN GYLLENE KAKAN'] },
    garden: { wall: 'Ơ', floors: ['floor_garden', 'floor_gold_tiles'], ceil: 'floor_wood_planks', names: ['DET GÖMDA LUSTHUSET', 'TRÄDGÅRDSMÄSTARENS BOD', 'ORANGERIETS SKATT'] }, // version 16
    dream: { wall: 'Ƣ', floors: ['floor_dream', 'floor_gold_tiles'], ceil: 'floor_dream', names: ['DEN GYLLENE DRÖMMEN', 'JON BLUNDS GÖMMA', 'SKATTEN BAKOM ÖGONLOCKEN'] },
  };
  const GOLD_FOG = rng => [rng.int(24, 28), rng.int(19, 23), rng.int(8, 12)]; // varmt guldskimmer
  function secret(seed, opts) {
    opts = opts || {};
    const bid = SECRET_LOOKS[opts.biome] ? opts.biome : 'dungeon', look = SECRET_LOOKS[bid], root = RNG(seed).fork('secret-' + bid);
    const depth = Math.max(1, Math.min(5, Math.round(opts.depth || 1)));
    const lrng = root.fork('look'), name = lrng.pick(look.names), fog = GOLD_FOG(lrng), ambient = roundAmb(lrng, [0.22, 0.28]);
    for (let attempt = 0; attempt < 30; attempt++) {
      const lv = buildSecret(root.fork('s' + attempt), look);
      if (!lv) continue;
      const level = {
        name, biome: bid, floor: look.floors[0], floors: look.floors.slice(), floorMask: lv.floorMask, ceil: look.ceil, sky: null,
        secretWall: look.wall, fog, ambient, map: lv.map, depth, seed, rooms: lv.rooms, roomMask: lv.roomMask, theme: 'secret', secret: true, saws: [], winds: [], teleports: [], belts: [], arenas: [], shifts: [],
      };
      level.features = features(level.map);
      if (!validate(level).length) return level;
    }
    throw new Error('Gen.secret: kunde inte bygga en hemlig våning (seed ' + seed + ')');
  }
  function buildSecret(rng, look) {
    const k = rng.int(2, 4), slots = [];
    for (let i = 0; i < k; i++) slots.push(rng.int(k === 4 ? 7 : 8, k === 2 ? 11 : 9));
    const W = 2 + slots.reduce((a, b) => a + b, 0), H = rng.int(15, 19), wc = look.wall;
    const G = Grid(W, H, wc), { g } = G, rid = new Int16Array(W * H).fill(-1), rooms = [];
    // rummen: ett per kolumnfält, minst tre rutor emellan (dörr, korridor, dörr)
    let sx = 1;
    for (let i = 0; i < k; i++) {
      const sw = slots[i], w = rng.int(Math.max(4, sw - 5), sw - 3), h = rng.int(6, Math.min(11, H - 4)), x = sx + rng.int(0, sw - 3 - w), y = rng.int(1, H - 1 - h);
      const r = { x, y, w, h, cx: x + (w >> 1), cy: y + (h >> 1), id: i, cells: [] };
      for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) { g[yy][xx] = '.'; rid[yy * W + xx] = i; r.cells.push([xx, yy]); if (i) G.fm[yy * W + xx] = 1; }
      rooms.push(r); sx += sw;
    }
    // korridorer: ut genom östra väggen, vertikalt i en kolumn mellan rummen, in genom västra väggen; dörrar i båda ändar
    for (let i = 0; i + 1 < k; i++) {
      const a = rooms[i], b = rooms[i + 1];
      const ya = rng.int(a.y + 1, a.y + a.h - 2), yb = rng.int(b.y + 1, b.y + b.h - 2), mx = rng.int(a.x + a.w + 1, b.x - 2);
      for (let x = a.x + a.w + 1; x <= mx; x++) g[ya][x] = '.';
      for (let y = Math.min(ya, yb); y <= Math.max(ya, yb); y++) g[y][mx] = '.';
      for (let x = mx; x <= b.x - 2; x++) g[yb][x] = '.';
      g[ya][a.x + a.w] = 'D'; markDoor(G, a.x + a.w, ya, a.x + a.w + 1, ya, a.x + a.w - 1, ya);
      g[yb][b.x - 1] = 'D'; markDoor(G, b.x - 1, yb, b.x - 2, yb, b.x, yb);
    }
    const st = rooms[0], ex = rooms[k - 1], P = [st.cx, st.cy], X = [ex.x + ex.w - 2, ex.cy];
    g[P[1]][P[0]] = 'P'; g[X[1]][X[0]] = 'x';
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { G.lockMin(P[0] + dx, P[1] + dy, 1); G.lockMin(X[0] + dx, X[1] + dy, 1); }
    // föremål på fria rutor (aldrig i dörrpassager), hinder via plant (stänger aldrig av något)
    const free = (r, pred) => rng.shuffle(r.cells.filter(([x, y]) => g[y][x] === '.' && G.lock[y * W + x] < 2 && (!pred || pred(x, y))));
    const put = (r, ch, pred) => { const c = free(r, pred)[0]; if (!c) return null; g[c[1]][c[0]] = ch; return c; };
    const wallAdj = (x, y) => [0, 1, 2, 3].some(d => isWall(g[y + DY[d]][x + DX[d]]));
    const loot = rooms.slice(1);
    for (const r of rooms) { // ljus och dekor: kandelabrar vid väggarna, ett eldfat, kistor/statyer/lådor
      for (let n = rng.int(1, 2); n > 0; n--) put(r, 'c', wallAdj);
      if (r !== st) for (const [x, y] of free(r, wallAdj)) if (plant(G, x, y, 'f')) break;
      for (let n = rng.int(1, 2); n > 0; n--) for (const [x, y] of free(r, wallAdj)) if (plant(G, x, y, rng.pick(r === st ? 'TTk' : 'uTk'))) break;
    }
    const nChest = rng.int(2, 4);
    for (let i = 0; i < nChest; i++) if (!put(loot[i % loot.length], 'C')) return null;
    for (let i = rng.int(5, 9); i > 0; i--) put(rng.pick(loot), '$');
    if (!put(ex, 'ª') && !put(rng.pick(loot), 'ª')) return null;
    put(rng.pick(rooms), 'h'); put(rng.pick(loot), 'a'); if (rng.chance(0.5)) put(rng.pick(loot), rng.chance(0.5) ? 'A' : '¥');
    // eliter (1-3) vaktar skatten: i skattrummen, minst 7 rutor från P
    const nE = rng.int(1, 3);
    for (let i = 0; i < nE; i++) {
      const r = loot[(loot.length - 1 - i % loot.length + loot.length) % loot.length];
      if (!put(r, 'E', (x, y) => Math.hypot(x - P[0], y - P[1]) >= 7) && !loot.some(q => put(q, 'E', (x, y) => Math.hypot(x - P[0], y - P[1]) >= 7))) return null;
    }
    const out = rooms.map((r, i) => ({ x: r.x, y: r.y, w: r.w, h: r.h, type: i === 0 ? 'start' : i === k - 1 ? 'exit' : 'treasure', arch: i === 0 ? 'start' : 'vault', tag: 'secretfloor' }));
    const mask = new Array(W * H);
    for (let i = 0; i < W * H; i++) mask[i] = rid[i] < 0 ? '-' : String.fromCharCode(48 + rid[i]);
    return { map: g.map(r => r.join('')), floorMask: rowsOf(W, H, G.fm), rooms: out, roomMask: rowsOf(W, H, mask) };
  }

  // ---------- Labyrint (Gen.maze, version 7) ----------
  // En enda stor labyrint (46x46 rutor): 15x15 celler med 3 rutors delning, en perfekt labyrint (slumpad djupet först) med ~10 % extra
  // öppningar (slingor). Celler i breda zoner (brus) är 2x2 rutor (gångarna där blir 2 breda), övriga 1x1 (1 bred). 3-5 små rum om 2x2
  // celler (5x5 rutor): startrummet i ett hörn (P) och skattrum med kistor och föremål; utgången x i änden av den längsta vägen från P.
  // 8-14 fiender utspridda långt från P, 2-4 lampoljor (helst i återvändsgränder), en krönikesida, hälsa, ammo och guld.
  // Utseendet (väggtecken, golv, tak, himmel, namn) efter opts.biome (standard dungeon); opts.depth (standard 3) styr fiendesorterna.
  const MAZE_LOOKS = {
    dungeon: { wall: '1', floors: ['floor_stone_pattern', 'floor_stone'], ceil: 'floor_stone', sky: false, fog: [18, 14, 12], ambient: [0.14, 0.19], names: ['LABYRINTEN', 'DE TUSEN GÅNGARNA', 'MINOTAURENS VALV'] },
    caves: { wall: '8', floors: ['floor_cave', 'floor_mud'], ceil: 'ceil_cave', sky: false, fog: [12, 10, 9], ambient: [0.12, 0.16], names: ['GRUVLABYRINTEN', 'DE VILSNA GÅNGARNA'] },
    graveyard: { wall: '7', floors: ['floor_gravel', 'floor_grass_dead'], ceil: 'floor_stone', sky: true, fog: [12, 14, 24], ambient: [0.22, 0.28], names: ['GRAVLABYRINTEN', 'DE DÖDAS IRRGÅNG'] },
    forest: { wall: '6', floors: ['floor_ground_grass', 'floor_ground_dirt'], ceil: 'floor_wood_planks', sky: true, fog: [12, 14, 24], ambient: [0.22, 0.3], names: ['HÄCKLABYRINTEN', 'HÄXANS IRRGÅNG'] },
    courtyard: { wall: '1', floors: ['floor_gravel', 'floor_stone'], ceil: 'floor_wood_planks', sky: true, fog: [12, 14, 24], ambient: [0.22, 0.28], names: ['SLOTTSLABYRINTEN', 'KUNGENS IRRGÅNG'] },
    swamp: { wall: '0', floors: ['floor_swamp', 'floor_mud'], ceil: 'floor_wood_planks', sky: true, fog: [14, 21, 13], ambient: [0.2, 0.26], names: ['VASSLABYRINTEN', 'DIMKÄRRETS IRRGÅNG'] },
    frost: { wall: 'Ø', floors: ['floor_frost_stone', 'floor_snow'], ceil: 'floor_frost_stone', sky: false, fog: [19, 24, 32], ambient: [0.18, 0.24], names: ['ISLABYRINTEN', 'DE FRUSNA GÅNGARNA'] },
    volcano: { wall: 'Ò', floors: ['floor_basalt', 'floor_ash'], ceil: 'floor_basalt', sky: false, fog: [32, 14, 9], ambient: [0.17, 0.23], names: ['OBSIDIANLABYRINTEN', 'DE GLÖDANDE GÅNGARNA'] },
    tomb: { wall: 'È', floors: ['floor_sand', 'floor_gold_tiles'], ceil: 'floor_sand', sky: false, fog: [32, 26, 16], ambient: [0.18, 0.24], names: ['FARAONENS LABYRINT', 'DE BEGRAVDAS IRRGÅNG'] },
    crystal: { wall: 'Ą', floors: ['floor_crystal', 'floor_cave'], ceil: 'ceil_cave', sky: false, fog: [16, 12, 31], ambient: [0.11, 0.15], names: ['KRISTALLABYRINTEN', 'DE SPEGLANDE GÅNGARNA'] },
    sunken: { wall: 'Ċ', floors: ['floor_sunken_tiles', 'floor_stone'], ceil: 'floor_stone', sky: true, fog: [9, 20, 25], ambient: [0.18, 0.24], names: ['DEN SJUNKNA LABYRINTEN', 'DE DRUNKNADES IRRGÅNG'] },
    // version 9: urverkslabyrinten (mässing, kuggväggar runt rummen) och molnlabyrinten (murar av molnsten under öppen himmel, inget tomrum)
    clock: { wall: 'Ĺ', floors: ['floor_brass', 'floor_wood_planks'], ceil: 'floor_brass', sky: false, fog: [30, 23, 12], ambient: [0.15, 0.2], names: ['URVERKSLABYRINTEN', 'KUGGARNAS IRRGÅNG'] },
    sky: { wall: 'ļ', floors: ['floor_cloud', 'floor_cloud'], ceil: 'floor_cloud', sky: true, fog: [28, 31, 36], ambient: [0.24, 0.3], names: ['MOLNLABYRINTEN', 'VINDARNAS IRRGÅNG'] },
    // version 11: myceltrasslet (svampvägg, glödande svamphattar runt rummen) och spegellabyrinten (marmor, spegelväggar runt rummen)
    fungus: { wall: 'ŝ', floors: ['floor_moss', 'floor_cave'], ceil: 'ceil_cave', sky: false, fog: [19, 27, 23], ambient: [0.12, 0.17], names: ['MYCELTRASSLET', 'SPORERNAS IRRGÅNG'] },
    mirror: { wall: 'Š', floors: ['floor_marble', 'floor_gold_tiles'], ceil: 'floor_marble', sky: false, fog: [25, 24, 32], ambient: [0.18, 0.24], names: ['SPEGELLABYRINTEN', 'DE TUSEN SPEGLARNAS IRRGÅNG'] },
    // version 13: hyllabyrinten (panelväggar, bokhyllor runt rummen) och gjuterilabyrinten (järnplåt, smältugnar runt rummen)
    library: { wall: 'Ū', floors: ['floor_carpet', 'floor_wood_planks'], ceil: 'floor_wood_planks', sky: false, fog: [24, 18, 13], ambient: [0.13, 0.18], names: ['HYLLABYRINTEN', 'DE DAMMIGA GÅNGARNAS IRRGÅNG'] },
    foundry: { wall: 'ŵ', floors: ['floor_irongrate', 'floor_stone'], ceil: 'floor_irongrate', sky: false, fog: [32, 19, 11], ambient: [0.16, 0.22], names: ['GJUTERILABYRINTEN', 'RÖRENS IRRGÅNG'] },
    // version 15: katedralens irrgång (blyinfattade fönster runt rummen) och vaxlabyrinten (honungskakor runt rummen)
    cathedral: { wall: 'Ɗ', floors: ['floor_cathedral', 'floor_stone_pattern'], ceil: 'floor_stone_pattern', sky: false, fog: [28, 10, 12], ambient: [0.14, 0.19], names: ['KATAKOMBERNA UNDER KORET', 'MARTYRERNAS IRRGÅNG'] },
    hive: { wall: 'Ɠ', floors: ['floor_hivefloor', 'floor_hivefloor'], ceil: 'floor_hivefloor', sky: false, fog: [32, 23, 8], ambient: [0.15, 0.21], names: ['VAXLABYRINTEN', 'DE TUSEN CELLERNA'] },
    // version 16: häcklabyrinten (häckar under öppen himmel, trädgårdsmur runt rummen) och drömlabyrinten (drömväggar)
    garden: { wall: 'Ɵ', floors: ['floor_garden', 'floor_ground_grass'], ceil: 'floor_wood_planks', sky: true, fog: [14, 18, 16], ambient: [0.22, 0.28], names: ['DEN DÖDA HÄCKLABYRINTEN', 'TRÄDGÅRDSMÄSTARENS IRRGÅNG'] },
    dream: { wall: 'Ƣ', floors: ['floor_dream', 'floor_marble'], ceil: 'floor_dream', sky: false, fog: [22, 11, 30], ambient: [0.14, 0.2], names: ['DRÖMLABYRINTEN', 'DEN ÄNDLÖSA KORRIDOREN'] },
  };
  function maze(seed, opts) {
    opts = opts || {};
    const bid = MAZE_LOOKS[opts.biome] ? opts.biome : 'dungeon', look = MAZE_LOOKS[bid], root = RNG(seed).fork('maze-' + bid);
    const depth = Math.max(1, Math.min(5, Math.round(opts.depth || 3)));
    const lrng = root.fork('look'), name = lrng.pick(look.names), ambient = roundAmb(lrng, look.ambient);
    for (let attempt = 0; attempt < 30; attempt++) {
      const lv = buildMaze(root.fork('m' + attempt), depth, look, bid);
      if (!lv) continue;
      const level = {
        name, biome: bid, floor: look.floors[0], floors: look.floors.slice(), floorMask: lv.floorMask, ceil: look.ceil, sky: look.sky ? lv.sky : null,
        secretWall: look.wall, fog: look.fog.slice(), ambient, map: lv.map, depth, seed, rooms: lv.rooms, roomMask: lv.roomMask, theme: 'maze', maze: true,
        boulders: [], beams: [], saws: [], winds: [], teleports: [], belts: [], arenas: [], shifts: [],
      };
      level.features = features(level.map, level.beams);
      if (!validate(level).length) return level;
    }
    throw new Error('Gen.maze: kunde inte bygga en labyrint (seed ' + seed + ')');
  }
  function buildMaze(rng, depth, look, bid) {
    const n = 15, W = 3 * n + 1, H = W, wc = look.wall, N = W * H;
    const G = Grid(W, H, wc), { g, fm } = G;
    const ax = i => 1 + 3 * i, id = (i, j) => j * n + i;
    // breda zoner (brus): där är cellerna 2x2 rutor
    const NZ = fbm(rng, n, n, 4), wide = new Uint8Array(n * n);
    for (let k = 0; k < n * n; k++) wide[k] = NZ[k] > 0.5 ? 1 : 0;
    // rummen: 2x2 celler (5x5 rutor); startrummet i ett slumpat hörn, 2-4 skattrum utspridda
    const corner = rng.int(0, 3), sI = corner & 1 ? n - 2 : 0, sJ = corner & 2 ? n - 2 : 0;
    const roomOf = new Int16Array(n * n).fill(-1), rms = [];
    const addRoom = (i, j, type) => {
      const r = { i, j, type, id: rms.length, x: ax(i), y: ax(j), w: 5, h: 5 };
      rms.push(r);
      for (let dj = 0; dj < 2; dj++) for (let di = 0; di < 2; di++) { roomOf[id(i + di, j + dj)] = r.id; wide[id(i + di, j + dj)] = 1; }
      return r;
    };
    addRoom(sI, sJ, 'start');
    const nR = rng.int(2, 4);
    for (let t = 0; t < 300 && rms.length < nR + 1; t++) {
      const i = rng.int(0, n - 2), j = rng.int(0, n - 2);
      if (rms.some(r => Math.abs(r.i - i) < 4 && Math.abs(r.j - j) < 4)) continue;
      addRoom(i, j, 'treasure');
    }
    if (rms.length < 3) return null;
    // perfekt labyrint: slumpad djupet först (rummets fyra celler hänger redan ihop), sedan ~10 % extra öppningar (slingor)
    const links = [], linked = new Set(), key = (a, b) => (a < b ? a * 1024 + b : b * 1024 + a);
    const vis = new Uint8Array(n * n), st = [];
    const visit = c => {
      const k = roomOf[c];
      if (k < 0) { vis[c] = 1; st.push(c); return; }
      const r = rms[k];
      for (let dj = 0; dj < 2; dj++) for (let di = 0; di < 2; di++) { const q = id(r.i + di, r.j + dj); if (!vis[q]) { vis[q] = 1; st.push(q); } }
    };
    const link = (a, b) => { linked.add(key(a, b)); links.push([a, b]); };
    visit(id(sI, sJ));
    while (st.length) {
      const c = st[st.length - 1], i = c % n, j = (c / n) | 0, nb = [];
      for (let d = 0; d < 4; d++) { const ni = i + DX[d], nj = j + DY[d]; if (ni >= 0 && nj >= 0 && ni < n && nj < n && !vis[id(ni, nj)]) nb.push(id(ni, nj)); }
      if (!nb.length) { st.pop(); continue; }
      const t = rng.pick(nb); link(c, t); visit(t);
    }
    const extra = [];
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) for (const [di, dj] of [[1, 0], [0, 1]]) {
      if (i + di >= n || j + dj >= n) continue;
      const a = id(i, j), b = id(i + di, j + dj);
      if (linked.has(key(a, b)) || (roomOf[a] >= 0 && roomOf[a] === roomOf[b])) continue;
      extra.push([a, b]);
    }
    for (const [a, b] of rng.shuffle(extra).slice(0, Math.round(0.1 * n * n))) link(a, b);
    // huggning: cellerna, gångarna mellan dem (2 breda om båda cellerna är breda) och rummen
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const w = wide[id(i, j)] ? 2 : 1; for (let dy = 0; dy < w; dy++) for (let dx = 0; dx < w; dx++) g[ax(j) + dy][ax(i) + dx] = '.'; }
    for (const [a, b] of links) {
      const p = Math.min(a, b), q = Math.max(a, b), i = p % n, j = (p / n) | 0, hz = q === p + 1, w = wide[p] && wide[q] ? 2 : 1;
      for (let t = 0; t < w; t++) for (let k = 0; k <= 3; k++) { if (hz) g[ax(j) + t][ax(i) + k] = '.'; else g[ax(j) + k][ax(i) + t] = '.'; }
    }
    const rid = new Int16Array(N).fill(-1);
    for (const r of rms) for (let y = r.y; y < r.y + 5; y++) for (let x = r.x; x < r.x + 5; x++) { g[y][x] = '.'; rid[y * W + x] = r.id; fm[y * W + x] = 1; }
    // start och utgång: P mitt i startrummet, x i änden av den längsta vägen (utanför rummen)
    const sr = rms[0], P = [sr.x + 2, sr.y + 2];
    g[P[1]][P[0]] = 'P';
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) G.lockMin(P[0] + dx, P[1] + dy, 1);
    const dS = bfsG(G, [P], c => !isBlock(c));
    let X = null, best = -1;
    for (let i = 0; i < N; i++) if (dS[i] > best && rid[i] < 0 && g[(i / W) | 0][i % W] === '.') { best = dS[i]; X = [i % W, (i / W) | 0]; }
    if (!X || best < 2 * W) return null;
    g[X[1]][X[0]] = 'x';
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) G.lockMin(X[0] + dx, X[1] + dy, 1);
    const ex = { type: 'exit', id: rms.length, x: X[0] - (X[0] - 1) % 3, y: X[1] - (X[1] - 1) % 3, w: 2, h: 2 };
    rms.push(ex);
    for (let y = ex.y; y < ex.y + 2; y++) for (let x = ex.x; x < ex.x + 2; x++) if (rid[y * W + x] < 0) rid[y * W + x] = ex.id;
    // innehåll
    const free = (pred) => { const out = []; for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) if (g[y][x] === '.' && !G.lock[y * W + x] && pred(x, y)) out.push([x, y]); return rng.shuffle(out); };
    const nW = (x, y) => [0, 1, 2, 3].reduce((k, d) => k + (isWall(g[y + DY[d]][x + DX[d]]) ? 1 : 0), 0);
    const deadEnds = free((x, y) => rid[y * W + x] < 0 && nW(x, y) === 3 && dS[y * W + x] >= 12);
    const put = (list, ch, spread) => { for (const [x, y] of list) if (g[y][x] === '.' && !(spread && nearAny(x, y, ch, spread))) { g[y][x] = ch; return [x, y]; } return null; };
    const nearAny = (x, y, ch, d) => { for (let yy = y - d; yy <= y + d; yy++) for (let xx = x - d; xx <= x + d; xx++) if (G.at(xx, yy) === ch) return true; return false; };
    const inRoom = r => free((x, y) => rid[y * W + x] === r.id);
    for (const r of rms.filter(r => r.type === 'treasure')) {
      g[r.y + 2][r.x + 2] = 'C';
      for (const [x, y] of [[r.x, r.y], [r.x + 4, r.y + 4], [r.x + 4, r.y], [r.x, r.y + 4]].slice(0, rng.int(1, 2))) if (g[y][x] === '.' && nW(x, y) >= 2) g[y][x] = 'c';
      for (let k = rng.int(1, 2); k > 0; k--) put(inRoom(r), '$');
      put(inRoom(r), rng.pick(['h', 'a', 'A', '¥', ',']));
    }
    if (rng.chance(0.6)) put(inRoom(sr).filter(([x, y]) => cheb(x, y, P[0], P[1]) >= 2), rng.chance(0.5) ? 'h' : 'a');
    put(free((x, y) => rid[y * W + x] === sr.id && nW(x, y) >= 2 && cheb(x, y, P[0], P[1]) >= 2), 'c');
    // krönikesidan i ett skattrum, lampoljan (2-4) och resten av föremålen helst i återvändsgränderna
    if (!put(inRoom(rng.pick(rms.filter(r => r.type === 'treasure'))), 'þ')) return null;
    let nb = 0;
    for (let k = rng.int(2, 4); k > 0; k--) if (put(deadEnds, '¼', 6) || put(free((x, y) => dS[y * W + x] >= 12), '¼', 6)) nb++;
    if (nb < 2) return null;
    for (let k = rng.int(2, 3); k > 0; k--) put(deadEnds, 'h', 4) || put(free(() => true), 'h', 4);
    for (let k = rng.int(2, 3); k > 0; k--) put(deadEnds, 'a', 4) || put(free(() => true), 'a', 4);
    for (let k = rng.int(2, 4); k > 0; k--) put(free((x, y) => rid[y * W + x] < 0), '$', 5);
    // fiender (8-14): en och en, utspridda över labyrintens gångar, långt från P
    const eTypes = enemyTypes(depth, bid);
    const spots = free((x, y) => rid[y * W + x] < 0 && dS[y * W + x] >= 10 && Math.hypot(x - P[0], y - P[1]) >= 7); // i gångarna, rummen är fria
    const want = rng.int(8, 14), foes = [];
    for (const sp of [6, 5, 4, 3]) for (const [x, y] of spots) {
      if (foes.length >= want) break;
      if (g[y][x] !== '.' || foes.some(p => cheb(p[0], p[1], x, y) < sp)) continue;
      g[y][x] = rng.weighted(eTypes, t => t[1])[0]; foes.push([x, y]);
    }
    if (foes.length < 8) return null;
    // gravkammarens labyrint: hieroglyfer runt rummen
    if (bid === 'tomb') for (const r of rms) for (let y = r.y - 1; y <= r.y + r.h; y++) for (let x = r.x - 1; x <= r.x + r.w; x++) if (G.inb(x, y) && g[y][x] === 'È') g[y][x] = 'Ì';
    // kristallabyrinten: lysande ådror runt rummen; sjunkna labyrinten: korall runt rummen (version 8)
    if (bid === 'crystal' || bid === 'sunken') for (const r of rms) for (let y = r.y - 1; y <= r.y + r.h; y++) for (let x = r.x - 1; x <= r.x + r.w; x++)
      if (G.inb(x, y) && g[y][x] === wc && (x + y) % 3 === 0) g[y][x] = bid === 'crystal' ? 'Ć' : 'Č';
    // urverkslabyrinten: kuggväggar runt rummen; molnlabyrinten: stormmur runt rummen (version 9)
    if (bid === 'clock' || bid === 'sky') for (const r of rms) for (let y = r.y - 1; y <= r.y + r.h; y++) for (let x = r.x - 1; x <= r.x + r.w; x++)
      if (G.inb(x, y) && g[y][x] === wc && (x + y) % 3 === 0) g[y][x] = bid === 'clock' ? 'ĺ' : 'Ľ';
    // myceltrasslet: glödande svamphattar runt rummen; spegellabyrinten: spegelväggar runt rummen (version 11)
    if (bid === 'fungus' || bid === 'mirror') for (const r of rms) for (let y = r.y - 1; y <= r.y + r.h; y++) for (let x = r.x - 1; x <= r.x + r.w; x++)
      if (G.inb(x, y) && g[y][x] === wc && (x + y) % 3 === 0) g[y][x] = bid === 'fungus' ? 'Ş' : 'š';
    // hyllabyrinten: bokhyllor runt rummen; gjuterilabyrinten: smältugnar runt rummen (version 13)
    if (bid === 'library' || bid === 'foundry') for (const r of rms) for (let y = r.y - 1; y <= r.y + r.h; y++) for (let x = r.x - 1; x <= r.x + r.w; x++)
      if (G.inb(x, y) && g[y][x] === wc && (x + y) % 3 === 0) g[y][x] = bid === 'library' ? 'ũ' : 'Ŷ';
    // katedralens irrgång: blyinfattade fönster runt rummen; vaxlabyrinten: honungskakor; häcklabyrinten: trädgårdsmur (version 15/16)
    if (bid === 'cathedral' || bid === 'hive' || bid === 'garden') for (const r of rms) for (let y = r.y - 1; y <= r.y + r.h; y++) for (let x = r.x - 1; x <= r.x + r.w; x++)
      if (G.inb(x, y) && g[y][x] === wc && (bid === 'garden' || (x + y) % 3 === 0)) g[y][x] = bid === 'cathedral' ? 'Ƌ' : bid === 'hive' ? 'Ɣ' : 'Ơ';
    const mask = new Array(N);
    for (let i = 0; i < N; i++) mask[i] = rid[i] < 0 ? '-' : String.fromCharCode(48 + rid[i]);
    const sky = new Array(N).fill('1');
    return {
      map: g.map(r => r.join('')), floorMask: rowsOf(W, H, fm), roomMask: rowsOf(W, H, mask), sky: rowsOf(W, H, sky),
      rooms: rms.map(r => ({ x: r.x, y: r.y, w: r.w, h: r.h, type: r.type, arch: r.type === 'start' ? 'start' : r.type === 'exit' ? 'exit' : 'vault', tag: 'maze' })),
    };
  }

  // ---------- Validering ----------
  const ENEMY_CHARS = 'SKVILNORWE' + Object.keys(NEW_ENEMIES).join('');
  const VALID = new Set((WALLS + 'DG*xPBhaA$CMfotn.QZ' + ENEMY_CHARS + PROP_CHARS + WEAPON_CHARS + GATES + HAZARD + NPCS + NPCS7 + NPCS8 + ",'}¥ªðþ¼½Ģ" + 'Ŋŋ' + 'Ũ' + 'Ƃ' + 'ƞƳ').split(''));
  const WATER_LOOT = '$haĢ¥'; // version 8: föremål som får ligga på en holme som bara nås simmande (vattenskatten; vrakkistan Ě räknas också)
  function validate(level) {
    const errs = [];
    const map = level && level.map;
    if (!Array.isArray(map) || !map.length) return ['kartan saknas'];
    const H = map.length, W = map[0].length;
    for (let y = 0; y < H; y++) if (typeof map[y] !== 'string' || map[y].length !== W) { errs.push('rad ' + y + ' har fel längd'); return errs; }
    const at = (x, y) => (x < 0 || y < 0 || x >= W || y >= H) ? '1' : map[y][x];
    const nCh = {};
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const c = map[y][x];
      nCh[c] = (nCh[c] || 0) + 1;
      if (!VALID.has(c)) errs.push('okänt tecken "' + c + '" vid ' + x + ',' + y);
      if ((x === 0 || y === 0 || x === W - 1 || y === H - 1) && !isWall(c)) errs.push('kanten är inte vägg vid ' + x + ',' + y);
    }
    let px = -1, py = -1, nP = 0, nX = 0;
    const exits = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (map[y][x] === 'P') { nP++; px = x; py = y; }
      if (map[y][x] === 'x') { nX++; exits.push([x, y]); }
    }
    if (nP !== 1) errs.push('förväntade exakt ett P, hittade ' + nP);
    if (nX < 1) errs.push('utgång x saknas');
    for (const [c, lim, what] of [['Z', 1, 'vaktare Z'], ['w', 1, 'brunnar w'], ['y', 1, 'altare y'], ['z', 6, 'spikfällor z'], ['(', 1, 'städ'], [')', 1, 'spåaltare'],
      ['[', 1, 'fångburar'], ['?', 1, 'utmaningsaltare'], [';', 1, 'offerskålar'], ['/', 1, 'spakar'], ['}', 1, 'nycklar'], ["'", 1, 'skattkartor'], ['<', 4, 'pilplattor'], ['>', 3, 'gasventiler'],
      ['£', 1, 'alkemister'], ['€', 1, 'präster'], ['©', 1, 'husdjursburar'], ['¥', 2, 'drycker'], ['Ç', 8, 'istappar'],
      ['¶', 1, 'lägereldar'], ['®', 1, 'anslagstavlor'], ['÷', 1, 'hemliga trappor'], ['ª', 1, 'runstenar'], ['ð', 2, 'kött'], ['°', 4, 'eldstrålar'],
      ['¬', 8, 'smulande golv'], ['±', 3, 'pendelblad'], ['¨', 2, 'tryckplattor'], ['Ñ', 2, 'nekromantiker'], ['Ð', 2, 'dödsriddare'],
      ['²', 5, 'sarkofager'], ['³', 1, 'larmklockor'], ['ç', 1, 'spelare'], ['ÿ', 1, 'bankirer'], ['ý', 1, 'vandrare'], ['þ', 1, 'krönikesidor'],
      ['¼', level.maze ? 4 : 2, 'lampoljor'], ['½', 2, 'kaststenshögar'], ['¹', 1, 'rullstensutlösare'], ['¯', level.arena ? 160 : QUICKSAND_CAP, 'kvicksandsrutor'],
      ['Î', 1, 'tjuvar'], ['Ô', 1, 'dubbelgångare'],
      ['Ā', 1, 'skuggjägare'], ['Ă', 1, 'häxor'], ['Ğ', 1, 'kartografer'], ['Ġ', 1, 'talangaltare'], ['Ģ', 2, 'kunskapsböcker'], ['Ė', level.arena ? 10 : 4, 'brytande kristaller'],
      ['Ě', 3, 'vrakkistor'], ['Ē', level.arena ? 40 : SPIKES8_CAP, 'kristallspikar'], ['Ĕ', level.arena ? 90 : TIDE_CAP, 'tidvattenrutor'], ['Ĝ', 6, 'luftbubblor'], ['Ó', 4, 'ålar'],
      ['Ŋ', 3, 'kugghjul'], ['ŋ', 1, 'fjädrar'], ['ŀ', 3, 'tidsbubblor'], ['Ň', 1, 'klockspel'], ['ň', 3, 'molnkistor'], ['ĸ', 2, 'molnjättar']])
      if ((nCh[c] || 0) > lim) errs.push('för många ' + what + ': ' + nCh[c]);
    if (nCh['ÿ'] && level.depth === 1) errs.push('bankir på första våningen');
    if ((nCh['µ'] || 0) + (nCh['ß'] || 0) > 3) errs.push('för många gift-/frosttunnor: ' + ((nCh['µ'] || 0) + (nCh['ß'] || 0)));
    if (level.arena && nCh['¶']) errs.push('lägereld i en bossarena');
    if (nCh['¨'] && !nCh['*'] && !nCh['{']) errs.push('tryckplatta utan hemlig/sprucken vägg');
    if (!!nCh['|'] !== !!nCh['/']) errs.push('järngrind utan spak eller spak utan järngrind');
    if (!!nCh[']'] !== !!nCh['}']) errs.push('låst dörr utan nyckel eller nyckel utan låst dörr');
    // version 8: tidvattnet (level.tide = { period: 24-40 s } eller null) och de nya tecknen bara där de får finnas
    if (level.tide !== undefined && level.tide !== null && (typeof level.tide !== 'object' || !Number.isInteger(level.tide.period) || level.tide.period < 24 || level.tide.period > 40))
      errs.push('level.tide ogiltigt (period 24-40)');
    if (nCh['Ĕ'] && !level.tide) errs.push('tidvatten Ĕ utan level.tide');
    if (['Ą', 'Ć', 'Ĉ', 'Ċ', 'Č', 'Ď', 'Đ', 'Ē', 'Ĕ', 'Ė', 'Ę', 'Ě', 'Ĝ', 'Ó', 'Ë', 'Í', 'Ï', 'Ú', 'Û'].some(c => nCh[c])) {
      const bio = level.biome, gb = level.guardian || level.boss, dw = Array.isArray(level.floors) ? level.floors.indexOf('floor_deepwater') : -1;
      const fmk = Array.isArray(level.floorMask) && level.floorMask.length === H ? level.floorMask : null;
      const nb = (x, y, set, n8) => { for (let k = 0; k < 8; k += n8 ? 1 : 2) if (set.includes(at(x + RX[k], y + RY[k]))) return true; return false; };
      const where = { 'Ą': bio === 'crystal', 'Ć': bio === 'crystal', 'Ĉ': gb === 'crystalqueen', 'Ċ': bio === 'sunken', 'Č': bio === 'sunken', 'Ď': gb === 'leviathan',
        'Đ': bio === 'sunken' || gb === 'leviathan', 'Ē': bio === 'crystal', 'Ė': bio === 'crystal', 'Ę': bio === 'crystal' || gb === 'crystalqueen',
        'Ĕ': bio === 'sunken', 'Ĝ': bio === 'sunken', 'Ó': bio === 'sunken', 'Ě': bio === 'sunken', 'Ë': bio === 'crystal', 'Í': bio === 'crystal',
        'Ï': bio === 'sunken', 'Ú': bio === 'sunken', 'Û': bio === 'sunken' };
      const told = {};
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const c = map[y][x];
        if (where[c] === undefined) continue;
        if (!where[c] && !told[c]) { told[c] = 1; errs.push('tecknet ' + c + ' hör inte hemma här (' + bio + ', ' + gb + ') vid ' + x + ',' + y); }
        if (c === 'Ó' && (!nb(x, y, 'ĐĜÓ', true) || (dw >= 0 && fmk && +fmk[y][x] !== dw))) errs.push('ål utanför vattnet vid ' + x + ',' + y);
        if (c === 'Ĝ' && !nb(x, y, 'ĐĜÓ', false)) errs.push('luftbubblor utanför vattnet vid ' + x + ',' + y);
        if (c === 'Ĕ' && !nb(x, y, 'ĐĜÓĔ', true)) errs.push('tidvatten långt från vattnet vid ' + x + ',' + y);
        if ((c === 'Ē' || c === 'Ĕ') && [0, 1, 2, 3].some(d => isDoorCh(at(x + DX[d], y + DY[d])))) errs.push('fälla ' + c + ' i dörröppning vid ' + x + ',' + y);
      }
    }
    // version 9: klocktornets och molnborgens tecken bara där de får finnas; sågspår, tidsbubblor och vindrutor aldrig i dörröppningar,
    // tidsbubblor i rum; level.saws och level.winds stämmer med kartan
    if (['Ĺ', 'ĺ', 'Ļ', 'ļ', 'Ľ', 'ľ', 'Ŀ', 'ŀ', 'Ń', 'ń', 'Ņ', 'ņ', 'Ň', 'ň', 'ĳ', 'Ĵ', 'ĵ', 'Ķ', 'ķ', 'ĸ'].some(c => nCh[c])) {
      const bio = level.biome, gb = level.guardian || level.boss, clk = bio === 'clock', sk = bio === 'sky';
      const rmk9 = Array.isArray(level.roomMask) && level.roomMask.length === H ? level.roomMask : null;
      const where = { 'Ĺ': clk, 'ĺ': clk, 'Ļ': gb === 'clockmaker', 'ļ': sk, 'Ľ': sk, 'ľ': gb === 'thunderbird', 'Ŀ': clk, 'ŀ': clk, 'Ń': sk, 'ń': sk,
        'Ņ': clk || gb === 'clockmaker', 'ņ': sk || gb === 'thunderbird', 'Ň': clk, 'ň': sk, 'ĳ': clk, 'Ĵ': clk, 'ĵ': clk, 'Ķ': sk, 'ķ': sk, 'ĸ': sk };
      const told = {};
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const c = map[y][x];
        if (where[c] === undefined) continue;
        if (!where[c] && !told[c]) { told[c] = 1; errs.push('tecknet ' + c + ' hör inte hemma här (' + bio + ', ' + gb + ') vid ' + x + ',' + y); }
        if ((c === 'Ŀ' || c === 'ŀ' || c === 'ń') && [0, 1, 2, 3].some(d => isDoorCh(at(x + DX[d], y + DY[d])))) errs.push('fälla ' + c + ' i dörröppning vid ' + x + ',' + y);
        if (c === 'ŀ' && rmk9 && rmk9[y] && rmk9[y][x] === '-') errs.push('tidsbubbla utanför ett rum vid ' + x + ',' + y);
      }
    }
    // version 10: de nya fienderna bara i sin biom och den närliggande (aldrig i arenor/labyrinter), på tillåtna djup, under taken; grävaren
    // aldrig intill vatten, rotvättarna i grupper om 2-3 i samma rum; legendaltaret högst 1, djup 2+, i ett lugnt rum med fri framsida
    if ([...FOES10_CH, 'Œ'].some(c => nCh[c])) {
      const bio = level.biome, rmk10 = Array.isArray(level.roomMask) && level.roomMask.length === H ? level.roomMask : null;
      const rooms0 = level.rooms || [], told = {}, roots = {};
      const roomAt = (x, y) => (rmk10 && rmk10[y] && rmk10[y][x] !== '-' ? rooms0[rmk10[y].charCodeAt(x) - 48] : null);
      for (const c of FOES10_CH) if ((nCh[c] || 0) > FOES10[c].max) errs.push('för många ' + c + ': ' + nCh[c]);
      if ((nCh['Œ'] || 0) > 1) errs.push('för många legendaltare: ' + nCh['Œ']);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const c = map[y][x];
        if (c === 'Œ') {
          const r = roomAt(x, y);
          if (level.arena || level.maze || level.secret || (level.depth !== undefined && level.depth < 2)) errs.push('legendaltare här (arena/labyrint/hemlig våning/djup ' + level.depth + ') vid ' + x + ',' + y);
          else if (rmk10 && (!r || ['normal', 'elite', 'exit', 'guardian', 'boss'].includes(r.type) || r.arch === 'challenge')) errs.push('legendaltare i ' + (r ? r.type + '/' + r.arch : 'korridor') + ' vid ' + x + ',' + y);
          if (![0, 1, 2, 3].some(d => { const a = at(x + DX[d], y + DY[d]); return !isBlock(a) && !HAZARD.includes(a); })) errs.push('legendaltaret saknar fri framsida vid ' + x + ',' + y);
          continue;
        }
        const F = FOES10[c];
        if (!F) continue;
        if ((level.arena || level.maze || level.secret || (bio !== F.home && !F.near.includes(bio))) && !told[c]) { told[c] = 1; errs.push('tecknet ' + c + ' hör inte hemma här (' + bio + ') vid ' + x + ',' + y); }
        if (level.depth !== undefined && level.depth < F.d) errs.push('fiende ' + c + ' på djup ' + level.depth + ' (minst ' + F.d + ') vid ' + x + ',' + y);
        if (c === 'ō' && [0, 1, 2, 3].some(d => { const a = at(x + DX[d], y + DY[d]); return a === '-' || isWet(a); })) errs.push('grävare i vattnet vid ' + x + ',' + y);
        if (c === 'ŏ') { const k = rmk10 && rmk10[y] ? rmk10[y][x] : '?'; roots[k] = (roots[k] || 0) + 1; }
      }
      for (const k in roots) if (roots[k] < 2 || roots[k] > 3) errs.push('rotvättar: ' + roots[k] + ' i ' + (k === '-' ? 'en korridor' : 'rum ' + (k.charCodeAt(0) - 48)) + ' (väntat en grupp om 2-3)');
    }
    // version 11: svamprikets och spegelpalatsets tecken bara där de får finnas (även i deras arenor, hemliga våningar och labyrinter),
    // fienderna på tillåtna djup och under taken, spegelväggar aldrig på dörrkarmar, studsplattor/sporpölar/teleportrar aldrig vid dörrar;
    // level.teleports stämmer med kartan (exakta par, i olika rum)
    if (['ŝ', 'Ş', 'ş', 'Š', 'š', 'Ţ', 'ţ', 'Ť', 'ť', 'Ŧ', 'ŧ', 'ŗ', 'Ř', 'ř', 'Ś', 'ś', 'Ŝ', 'Ũ'].some(c => nCh[c])) {
      const bio = level.biome, gb = level.guardian || level.boss, fu = bio === 'fungus', mi = bio === 'mirror';
      const where = { 'ŝ': fu, 'Ş': fu, 'ş': gb === 'mycelmother', 'Š': mi, 'š': mi, 'Ţ': gb === 'mirrorking', 'ţ': fu, 'Ť': fu, 'ť': mi,
        'Ŧ': fu || gb === 'mycelmother', 'ŧ': mi || gb === 'mirrorking', 'ŗ': fu, 'Ř': fu, 'ř': fu, 'Ś': mi, 'ś': mi, 'Ŝ': mi, 'Ũ': true };
      const deep = { 'Ř': 2, 'ř': 2, 'ś': 2 }, told = {};
      for (const [c, lim, what] of [['Ř', 2, 'mycelbestar'], ['ś', 2, 'illusionister'], ['Ũ', 2, 'sporsäckar'], ['Ť', level.arena ? 40 : SPOREPOOL11_CAP, 'sporpölsrutor'],
        ['ţ', level.arena ? 8 : 4, 'studsplattor'], ['ť', 6, 'teleportrar']])
        if ((nCh[c] || 0) > lim) errs.push('för många ' + what + ': ' + nCh[c]);
      if (nCh['Ũ'] && (level.arena || level.maze || level.secret)) errs.push('sporsäck i en arena/labyrint/hemlig våning');
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const c = map[y][x];
        if (where[c] === undefined) continue;
        if (!where[c] && !told[c]) { told[c] = 1; errs.push('tecknet ' + c + ' hör inte hemma här (' + bio + ', ' + gb + ') vid ' + x + ',' + y); }
        if (deep[c] && level.depth !== undefined && level.depth < deep[c]) errs.push('fiende ' + c + ' på djup ' + level.depth + ' (minst ' + deep[c] + ') vid ' + x + ',' + y);
        if ((c === 'š' || c === 'ť') && RX.some((dx, k) => isDoorCh(at(x + dx, y + RY[k])))) errs.push((c === 'š' ? 'spegelvägg på en dörrkarm' : 'teleporter intill en dörr') + ' vid ' + x + ',' + y);
        if ((c === 'ţ' || c === 'Ť') && [0, 1, 2, 3].some(d => isDoorCh(at(x + DX[d], y + DY[d])))) errs.push('fälla ' + c + ' i dörröppning vid ' + x + ',' + y);
      }
    }
    if (level.teleports !== undefined || nCh['ť']) {
      const tps = level.teleports, rmk11 = Array.isArray(level.roomMask) && level.roomMask.length === H ? level.roomMask : null;
      if (!Array.isArray(tps)) errs.push('teleportrar ť utan level.teleports (eller ogiltigt level.teleports)');
      else {
        const seen = new Set(), ok = p => p && Number.isInteger(p.x) && Number.isInteger(p.y) && at(p.x, p.y) === 'ť';
        for (const tp of tps) {
          const { a, b } = tp || {};
          if (!ok(a) || !ok(b)) { errs.push('teleporterparet pekar inte på två ť: ' + JSON.stringify(tp)); continue; }
          for (const p of [a, b]) { if (seen.has(p.y * W + p.x)) errs.push('teleportern finns i två par vid ' + p.x + ',' + p.y); seen.add(p.y * W + p.x); }
          if (a.x === b.x && a.y === b.y) errs.push('teleporterparet har samma ruta vid ' + a.x + ',' + a.y);
          else if (rmk11 && (rmk11[a.y][a.x] === '-' || rmk11[b.y][b.x] === '-' || rmk11[a.y][a.x] === rmk11[b.y][b.x])) errs.push('teleporterparet ligger inte i två olika rum: ' + JSON.stringify(tp));
        }
        if (seen.size !== (nCh['ť'] || 0)) errs.push('level.teleports har ' + seen.size + ' teleportrar men kartan har ' + (nCh['ť'] || 0) + ' ť');
      }
    }
    // version 13: bibliotekets och gjuteriets tecken bara där de får finnas (även i deras arenor, hemliga våningar och labyrinter), fienderna på
    // tillåtna djup och under taken, bläckpölar/kanaler/ventiler/rullband aldrig i dörröppningar; level.belts stämmer med kartan
    if (['ũ', 'Ū', 'ū', 'ŵ', 'Ŷ', 'ŷ', 'Ű', 'ű', 'Ŭ', 'Ÿ', 'Ź', 'ź', 'Ż', 'ż', 'Ų', 'ų', 'Ŵ', 'Ž', 'ž', 'ſ', 'Ƃ'].some(c => nCh[c])) {
      const bio = level.biome, gb = level.guardian || level.boss, li = bio === 'library', fo = bio === 'foundry';
      const where = { 'ũ': li, 'Ū': li, 'ū': gb === 'librarian', 'ŵ': fo, 'Ŷ': fo, 'ŷ': gb === 'colossus', 'Ű': li, 'ű': li || gb === 'librarian', 'Ŭ': li,
        'Ÿ': fo, 'Ź': fo, 'ź': fo, 'Ż': fo, 'ż': fo || gb === 'colossus', 'Ų': li, 'ų': li, 'Ŵ': li, 'Ž': fo, 'ž': fo, 'ſ': fo, 'Ƃ': true };
      const deep = { 'Ŵ': 2, 'Ž': 2 }, told = {};
      for (const [c, lim, what] of [['Ŵ', 2, 'arkivariespöken'], ['Ž', 2, 'smältgolemer'], ['Ƃ', INKFLASK13_CAP, 'bläckflaskor'], ['Ű', LECTERN13_CAP, 'pulpeter'],
        ['Ŭ', level.arena ? 40 : INK13_CAP, 'bläckpölsrutor'], ['ź', level.arena ? 6 : VENT13_CAP, 'ångventiler'], ['Ż', PRESS13_CAP, 'stansar'],
        ['Ÿ', BELT13_MAX * BELT13_LEN[1], 'rullbandsrutor']])
        if ((nCh[c] || 0) > lim) errs.push('för många ' + what + ': ' + nCh[c]);
      if (nCh['Ƃ'] && (level.arena || level.maze || level.secret)) errs.push('bläckflaska i en arena/labyrint/hemlig våning');
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const c = map[y][x];
        if (where[c] === undefined) continue;
        if (!where[c] && !told[c]) { told[c] = 1; errs.push('tecknet ' + c + ' hör inte hemma här (' + bio + ', ' + gb + ') vid ' + x + ',' + y); }
        if (deep[c] && level.depth !== undefined && level.depth < deep[c]) errs.push('fiende ' + c + ' på djup ' + level.depth + ' (minst ' + deep[c] + ') vid ' + x + ',' + y);
        if ((c === 'Ŭ' || c === 'Ź' || c === 'ź' || c === 'Ÿ') && [0, 1, 2, 3].some(d => isDoorCh(at(x + DX[d], y + DY[d])))) errs.push('fälla ' + c + ' i dörröppning vid ' + x + ',' + y);
      }
    }
    if (level.belts !== undefined || nCh['Ÿ']) {
      const belts = level.belts;
      if (!Array.isArray(belts)) errs.push('rullband Ÿ utan level.belts (eller ogiltigt level.belts)');
      else {
        const dir = new Map();
        for (const bt of belts) {
          const { x, y, dx, dy } = bt || {};
          if (![x, y, dx, dy].every(Number.isInteger) || Math.abs(dx) > 1 || Math.abs(dy) > 1 || Math.abs(dx) + Math.abs(dy) !== 1) { errs.push('rullbandet har ogiltig riktning: ' + JSON.stringify(bt)); continue; }
          if (at(x, y) !== 'Ÿ') errs.push('level.belts pekar på "' + at(x, y) + '" vid ' + x + ',' + y);
          if (dir.has(y * W + x)) errs.push('rullbandsrutan finns två gånger vid ' + x + ',' + y);
          dir.set(y * W + x, [dx, dy]);
        }
        for (const [k, [dx, dy]] of dir) { // bandet för i en riktning: nästa ruta är samma band (samma riktning) eller fritt golv där det slutar
          const x = k % W, y = (k / W) | 0, nx = x + dx, ny = y + dy, nxt = dir.get(ny * W + nx);
          if (nxt ? nxt[0] !== dx || nxt[1] !== dy : at(nx, ny) === 'Ÿ') errs.push('rullbandet byter riktning vid ' + nx + ',' + ny);
          else if (!nxt && isBlock(at(nx, ny))) errs.push('rullbandet för in i en vägg/ett hinder vid ' + x + ',' + y);
        }
        if (dir.size !== (nCh['Ÿ'] || 0)) errs.push('level.belts har ' + dir.size + ' rutor men kartan har ' + (nCh['Ÿ'] || 0) + ' Ÿ');
      }
    }
    if (level.saws !== undefined || nCh['Ŀ']) {
      const saws = level.saws;
      if (!Array.isArray(saws)) errs.push('sågspår Ŀ utan level.saws (eller ogiltigt level.saws)');
      else {
        const cov = new Uint8Array(W * H); let tot = 0;
        for (const sw of saws) {
          const { x0, y0, x1, y1 } = sw || {};
          if (![x0, y0, x1, y1].every(Number.isInteger) || (x0 !== x1 && y0 !== y1)) { errs.push('sågspåret är inte rakt: ' + JSON.stringify(sw)); continue; }
          const len = Math.abs(x1 - x0) + Math.abs(y1 - y0) + 1, ux = Math.sign(x1 - x0), uy = Math.sign(y1 - y0);
          if (len < 3 || len > 7) errs.push('sågspåret har ' + len + ' rutor (3-7) vid ' + x0 + ',' + y0);
          for (let k = 0; k < len; k++) {
            const x = x0 + ux * k, y = y0 + uy * k;
            if (at(x, y) !== 'Ŀ') { errs.push('sågspåret går utanför Ŀ vid ' + x + ',' + y); break; }
            if (cov[y * W + x]) errs.push('sågspåren överlappar vid ' + x + ',' + y);
            cov[y * W + x] = 1; tot++;
          }
        }
        if (tot !== (nCh['Ŀ'] || 0)) errs.push('level.saws täcker ' + tot + ' rutor men kartan har ' + (nCh['Ŀ'] || 0) + ' Ŀ');
      }
    }
    if (level.winds !== undefined || nCh['ń']) {
      const winds = level.winds;
      if (!Array.isArray(winds)) errs.push('vindrutor ń utan level.winds (eller ogiltigt level.winds)');
      else {
        const seen = new Set();
        for (const wd of winds) {
          const { x, y, dx, dy } = wd || {};
          if (![x, y, dx, dy].every(Number.isInteger) || Math.abs(dx) + Math.abs(dy) !== 1) { errs.push('vindrutan har ogiltig riktning: ' + JSON.stringify(wd)); continue; }
          if (at(x, y) !== 'ń') errs.push('level.winds pekar på "' + at(x, y) + '" vid ' + x + ',' + y);
          if (seen.has(y * W + x)) errs.push('vindrutan finns två gånger vid ' + x + ',' + y);
          seen.add(y * W + x);
          if (isBlock(at(x + dx, y + dy))) errs.push('vinden blåser ut i tomrummet/in i ett hinder vid ' + x + ',' + y);
        }
        if (seen.size !== (nCh['ń'] || 0)) errs.push('level.winds har ' + seen.size + ' rutor men kartan har ' + (nCh['ń'] || 0) + ' ń');
      }
    }
    // dörrar, eldfat och spikfällor
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const c = map[y][x];
      if (isDoorCh(c)) {
        const ew = isWall(at(x - 1, y)) && isWall(at(x + 1, y)), ns = isWall(at(x, y - 1)) && isWall(at(x, y + 1));
        if (!ew && !ns) errs.push('dörr ' + c + ' utan väggar på sidorna vid ' + x + ',' + y);
        else if (ew && ns) errs.push('dörr ' + c + ' innesluten av väggar vid ' + x + ',' + y);
        else {
          const a = ew ? at(x, y - 1) : at(x - 1, y), b = ew ? at(x, y + 1) : at(x + 1, y);
          if (isBlock(a) || isBlock(b)) errs.push('dörr ' + c + ' har blockerad passage vid ' + x + ',' + y);
        }
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (at(x + dx, y + dy) === 'f') errs.push('eldfat intill ' + c + ' vid ' + x + ',' + y);
      }
      if (HAZARD.includes(c) && c !== 'z') {
        if (nP === 1 && cheb(x, y, px, py) <= 1) errs.push('farligt golv/fälla ' + c + ' intill P vid ' + x + ',' + y);
        if (exits.some(e => cheb(x, y, e[0], e[1]) <= 1)) errs.push('farligt golv/fälla ' + c + ' intill utgången vid ' + x + ',' + y);
      }
      if (c === '<') { // pilplatta: en vägg inom 6 rutor i rak linje, aldrig i en dörröppning
        let ok = false;
        for (let d = 0; d < 4 && !ok; d++) for (let k = 1; k <= 6; k++) { const a = at(x + DX[d] * k, y + DY[d] * k); if (isWall(a)) { ok = true; break; } if (isBlock(a)) break; }
        if (!ok) errs.push('pilplatta utan vägg inom 6 rutor vid ' + x + ',' + y);
        for (let d = 0; d < 4; d++) if (isDoorCh(at(x + DX[d], y + DY[d]))) errs.push('pilplatta i dörröppning vid ' + x + ',' + y);
      }
      if (c === 'Ç' || c === '°' || c === '¬' || c === '±' || c === '¨' || c === '¯' || c === '¹') for (let d = 0; d < 4; d++) if (isDoorCh(at(x + DX[d], y + DY[d]))) errs.push('fälla ' + c + ' i dörröppning vid ' + x + ',' + y);
      if (c === '±' && !((isWall(at(x, y - 1)) && isWall(at(x, y + 1))) || (isWall(at(x - 1, y)) && isWall(at(x + 1, y))))) errs.push('pendelblad utanför en smal korridor vid ' + x + ',' + y);
      if (c === 'Þ' && ![0, 1, 2, 3, 4, 5, 6, 7].some(k => at(x + RX[k], y + RY[k]) === '_')) errs.push('lavamask utan lava intill vid ' + x + ',' + y);
      if (c === 'z') {
        if (nP === 1 && cheb(x, y, px, py) <= 1) errs.push('spikfälla intill P vid ' + x + ',' + y);
        if (exits.some(e => cheb(x, y, e[0], e[1]) <= 1)) errs.push('spikfälla intill utgången vid ' + x + ',' + y);
        for (let d = 0; d < 4; d++) if (isDoorCh(at(x + DX[d], y + DY[d]))) errs.push('spikfälla i dörröppning vid ' + x + ',' + y);
      }
    }
    // nåbarhet från P (4-grannskap; väggar, eldfat, köpman, blockerande rekvisita och stängda grindar | ] { blockerar):
    //  - allt gångbart nås (grindarna öppna), och allt utom lava/spikar nås utan att gå på lava eller spikar
    //  - med grindarna stängda nås allt utom valven (type 'vault') och hemliga rum; spak, nyckel och interaktiva saker nås då
    const rooms = level.rooms || [];
    if (nP === 1) {
      // smulande golv, kvicksand, djupt vatten, kristallspikar, tidvatten, sågspår och tidsbubblor räknas som lava: de får aldrig vara
      // enda vägen (tomrummet Ń blockerar: allt nås utan att gå på det)
      // version 11: studsplattor, sporpölar och teleportrar likaså (allt nås till fots utan dem); version 13: bläckpölar, smält metall och ångventiler
      // likaså (stansar Ż och bokhyllor ũ är hinder/väggar; rullbanden Ÿ är vanligt golv)
      const N = W * H, isGate = c => GATES.includes(c), haz = c => c === '_' || c === 'z' || c === '¬' || c === '¯' || isWet(c) || c === 'Ŀ' || c === 'ŀ' || c === 'ţ' || c === 'Ť' || c === 'ť'
        || c === 'Ŭ' || c === 'Ź' || c === 'ź' || c === 'Ɩ' || c === 'ƥ'; // (version 15/16: honung och taggrankor likaså)
      // per ruta: 1 gångbar, 2 grind (| ] {), 4 lava/spikar/vatten, 8 lava/spikar (inte simbart vatten)
      const cls = new Uint8Array(N);
      let wetN = 0;
      for (let y = 0; y < H; y++) { const row = map[y]; for (let x = 0; x < W; x++) { const c = row[x]; cls[y * W + x] = isBlock(c) ? (isGate(c) ? 2 : 0) : (haz(c) ? (WATER8.includes(c) ? (wetN++, 5) : 13) : 1); } }
      const stack = new Int32Array(N);
      const flood = (ok, no) => { // ok: tillåtna bitar, no: förbjudna bitar
        const seen = new Uint8Array(N); let sp = 0;
        stack[sp++] = py * W + px; seen[py * W + px] = 1;
        while (sp) {
          const cur = stack[--sp], x = cur % W;
          if (x > 0 && !seen[cur - 1] && (cls[cur - 1] & ok) && !(cls[cur - 1] & no)) { seen[cur - 1] = 1; stack[sp++] = cur - 1; }
          if (x < W - 1 && !seen[cur + 1] && (cls[cur + 1] & ok) && !(cls[cur + 1] & no)) { seen[cur + 1] = 1; stack[sp++] = cur + 1; }
          if (cur >= W && !seen[cur - W] && (cls[cur - W] & ok) && !(cls[cur - W] & no)) { seen[cur - W] = 1; stack[sp++] = cur - W; }
          if (cur < N - W && !seen[cur + W] && (cls[cur + W] & ok) && !(cls[cur + W] & no)) { seen[cur + W] = 1; stack[sp++] = cur + W; }
        }
        return seen;
      };
      const sAll = flood(3, 0), sSafe = flood(3, 4), sClosed = flood(1, 4);
      const sSwim = wetN ? flood(1, 8) : sClosed; // vattenskatten: simmande, utan lava/spikar, grindarna stängda
      const swimOK = (c, x, y) => (WATER_LOOT.includes(c) && sSwim[y * W + x]) || (c === 'Ě' && near(sSwim, x, y));
      const rm = Array.isArray(level.roomMask) && level.roomMask.length === H ? level.roomMask : null;
      const optional = (x, y) => { if (!rm || !rm[y]) return false; const r = rooms[rm[y].charCodeAt(x) - 48]; return !!r && (r.type === 'vault' || r.type === 'secret'); };
      const near = (s, x, y) => { for (let d = 0; d < 4; d++) { const nx = x + DX[d], ny = y + DY[d]; if (nx >= 0 && ny >= 0 && nx < W && ny < H && s[ny * W + nx]) return true; } return false; };
      let shown = 0;
      const bad = msg => { if (shown++ < 5) errs.push(msg); };
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const i = y * W + x;
        if (cls[i] === 0 && !isInter(map[y][x])) continue;
        const c = map[y][x];
        if (isGate(c) || isInter(c)) { if (!near(sClosed, x, y) && (c === '/' || !optional(x, y)) && !swimOK(c, x, y)) bad(c + ' nås inte från någon sida vid ' + x + ',' + y); continue; }
        if (isBlock(c)) continue;
        if (!sAll[i]) bad('onåbar ruta "' + c + '" vid ' + x + ',' + y);
        else if (!haz(c) && !sSafe[i] && !swimOK(c, x, y)) bad('ruta "' + c + '" nås bara över lava/spikar/vatten vid ' + x + ',' + y);
        else if (!haz(c) && !sClosed[i] && !optional(x, y) && !swimOK(c, x, y)) bad('ruta "' + c + '" nås bara genom en grind/låst dörr vid ' + x + ',' + y);
        else if (c === '}' && !sClosed[i]) bad('nyckeln ligger bakom en grind/låst dörr vid ' + x + ',' + y);
      }
      if (shown > 5) errs.push('... totalt ' + shown + ' nåbarhetsfel');
    }
    // fiender: inte i startrummet / nära P
    const startRoom = rooms.find(r => r.type === 'start');
    const inRoom = (r, x, y) => x >= r.x && y >= r.y && x < r.x + r.w && y < r.y + r.h;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const c = map[y][x];
      if (ENEMY_CHARS.includes(c) || c === 'Q' || c === 'Z') {
        if (nP === 1 && Math.hypot(x - px, y - py) < 6) errs.push('fiende ' + c + ' för nära P vid ' + x + ',' + y);
        if (startRoom && inRoom(startRoom, x, y)) errs.push('fiende ' + c + ' i startrummet vid ' + x + ',' + y);
      }
    }
    // rumstyper
    const startish = rooms.find(r => r.type === 'start' || r.type === 'boss');
    if (startish && nP === 1 && !inRoom(startish, px, py)) errs.push('P ligger inte i startrummet');
    const ex = rooms.find(r => r.type === 'exit');
    if (ex) {
      let found = false;
      for (let y = ex.y; y < ex.y + ex.h; y++) for (let x = ex.x; x < ex.x + ex.w; x++) if (at(x, y) === 'x') found = true;
      if (!found) errs.push('utgången x ligger inte i exit-rummet');
    }
    for (const k of ['name', 'floor', 'ceil', 'secretWall']) if (typeof level[k] !== 'string') errs.push('fältet ' + k + ' saknas');
    if (!Array.isArray(level.fog) || level.fog.length !== 3) errs.push('fog saknas');
    if (typeof level.ambient !== 'number') errs.push('ambient saknas');
    // biom, golvtexturer, golvmask, rumsmask och himmel (samma storlek som kartan)
    if (level.biome !== undefined && !BIOMES.some(b => b.id === level.biome)) errs.push('okänd biom ' + level.biome);
    if (level.guardian !== undefined && !GUARDIANS[level.guardian]) errs.push('okänd vaktare ' + level.guardian);
    const nF = Array.isArray(level.floors) ? level.floors.length : 1;
    if (level.floors !== undefined && (!Array.isArray(level.floors) || !nF || nF > 10 || level.floors.some(f => typeof f !== 'string') || level.floors[0] !== level.floor)) errs.push('floors ogiltigt (1-10 namn, floors[0] = floor)');
    const mask = (k, ok) => {
      const m = level[k];
      if (m === null || m === undefined) return;
      if (!Array.isArray(m) || m.length !== H) { errs.push(k + ' har fel storlek'); return; }
      for (let y = 0; y < H; y++) {
        if (typeof m[y] !== 'string' || m[y].length !== W) { errs.push(k + ' rad ' + y + ' har fel längd'); return; }
        for (let x = 0; x < W; x++) if (!ok(m[y][x])) { errs.push(k + ' har ogiltigt tecken "' + m[y][x] + '" vid ' + x + ',' + y); return; }
      }
    };
    mask('sky', c => c === '0' || c === '1');
    mask('floorMask', c => c >= '0' && c <= '9' && c.charCodeAt(0) - 48 < nF);
    mask('roomMask', c => c === '-' || (c.charCodeAt(0) >= 48 && c.charCodeAt(0) - 48 < rooms.length));
    // version 6: hemlig trappa bara i ett hemligt rum, tryckplattan i ett rum vid den hemliga/spruckna väggen
    const rmk = Array.isArray(level.roomMask) && level.roomMask.length === H ? level.roomMask : null;
    if (rmk && (nCh['÷'] || nCh['¨'])) for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const c = map[y][x];
      if (c !== '÷' && c !== '¨') continue;
      const k = rmk[y].charCodeAt(x) - 48, r = rooms[k];
      if (c === '÷' && (!r || r.type !== 'secret')) errs.push('hemlig trappa utanför ett hemligt rum vid ' + x + ',' + y);
      if (c === '¨') {
        let ok = false;
        if (r) for (let yy = 1; yy < H - 1 && !ok; yy++) for (let xx = 1; xx < W - 1; xx++) if (rmk[yy].charCodeAt(xx) - 48 === k && [0, 1, 2, 3].some(d => '*{'.includes(map[yy + DY[d]][xx + DX[d]]))) { ok = true; break; }
        if (!ok) errs.push('tryckplatta utan hemlig/sprucken vägg i rummet vid ' + x + ',' + y);
      }
    }
    // version 7: rullstenar (utlösaren ¹ i ena änden av en rak, fri korridor om minst 6 rutor) och ljusschakt (högst 6 rutor inomhus)
    if (level.boulders !== undefined) {
      if (!Array.isArray(level.boulders)) errs.push('boulders ogiltigt');
      else {
        if (level.boulders.length !== (nCh['¹'] || 0)) errs.push('boulders (' + level.boulders.length + ') stämmer inte med utlösarna ¹ (' + (nCh['¹'] || 0) + ')');
        for (const bd of level.boulders) {
          const { tx, ty, sx, sy } = bd || {};
          if (![tx, ty, sx, sy].every(Number.isInteger) || at(tx, ty) !== '¹') { errs.push('rullsten utan utlösare ¹ vid ' + tx + ',' + ty); continue; }
          if (tx !== sx && ty !== sy) { errs.push('rullstenens korridor är inte rak vid ' + tx + ',' + ty); continue; }
          const len = Math.abs(sx - tx) + Math.abs(sy - ty) + 1, ux = Math.sign(sx - tx), uy = Math.sign(sy - ty);
          if (len < 6) errs.push('rullstenens korridor är för kort (' + len + ') vid ' + tx + ',' + ty);
          for (let k = 0; k < len; k++) { const c = at(tx + ux * k, ty + uy * k); if (isBlock(c) || isDoorCh(c)) { errs.push('rullstenens korridor är blockerad vid ' + (tx + ux * k) + ',' + (ty + uy * k)); break; } }
        }
      }
    } else if (nCh['¹']) errs.push('utlösare ¹ utan level.boulders');
    if (level.beams !== undefined) {
      if (!Array.isArray(level.beams) || level.beams.length > 6) errs.push('beams ogiltigt (högst 6 rutor)');
      else for (const bm of level.beams) {
        const { x, y } = bm || {};
        if (!Number.isInteger(x) || !Number.isInteger(y) || x < 1 || y < 1 || x >= W - 1 || y >= H - 1 || isBlock(map[y][x])) { errs.push('ljusschakt på ogiltig ruta ' + x + ',' + y); continue; }
        if (Array.isArray(level.sky) && level.sky[y] && level.sky[y][x] === '1') errs.push('ljusschakt under öppen himmel vid ' + x + ',' + y);
      }
    }
    // version 14: de nya fienderna bara i sin biom, på tillåtna djup, högst max; marulken bara i/vid vatten
    if ([...FOES14_CH].some(c => nCh[c])) {
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const c = map[y][x], F = FOES14[c];
        if (!F) continue;
        if (level.biome !== F.home) errs.push('fiende ' + c + ' hör inte hemma här (' + level.biome + ') vid ' + x + ',' + y);
        if (level.depth !== undefined && level.depth < F.d) errs.push('fiende ' + c + ' på djup ' + level.depth + ' (minst ' + F.d + ') vid ' + x + ',' + y);
        if (c === 'ƈ' && !RX.some((dx, k) => WATER14.includes(at(x + dx, y + RY[k])))) errs.push('marulk utanför vattnet vid ' + x + ',' + y);
      }
      for (const c of FOES14_CH) if ((nCh[c] || 0) > FOES14[c].max) errs.push('för många ' + c + ': ' + nCh[c]);
    }
    // version 15/16: katedralens, bikupans, trädgårdens och drömrikets tecken bara där de får finnas (även i deras arenor, hemliga våningar och
    // labyrinter; väktarnas väggar, ljus och dekor i alla biomer), fienderna i sina biomer på tillåtna djup och under taken (aldrig i arenor),
    // de nya golvrutorna aldrig i dörröppningar, bikupor och drömflaskor aldrig i arenor/labyrinter/hemliga våningar, högst två klockor
    if (NEW1516_CHARS.some(c => nCh[c])) {
      const bio = level.biome, gb = level.guardian || level.boss, ca = bio === 'cathedral', hi = bio === 'hive', ga = bio === 'garden', dr = bio === 'dream';
      const where = { 'Ɗ': ca, 'Ƌ': ca, 'ƌ': gb === 'cardinal', 'Ɠ': hi, 'Ɣ': hi, 'ƕ': gb === 'queenbee', 'Ɵ': ga, 'Ơ': ga, 'ơ': gb === 'gardener', 'Ƣ': dr, 'ƣ': dr,
        'Ƥ': gb === 'sandman', 'ƍ': ca, 'Ɩ': hi, 'ƥ': ga, 'Ʀ': dr, 'Ǝ': ca || gb === 'cardinal', 'Ə': ca, 'Ɛ': ca, 'Ɨ': hi, 'Ƨ': ga, 'ƨ': ga || gb === 'gardener', 'Ʃ': dr,
        'ƪ': dr || gb === 'sandman', 'ƞ': true, 'Ƴ': true };
      const told = {}, A = !!level.arena;
      for (const [c, lim, what] of [['Ɛ', BELL15_CAP, 'klockor'], ['Ə', FONT15_CAP, 'blodfuntar'], ['Ɨ', SAC15_CAP, 'larvsäckar'], ['Ɩ', HONEY15_CAP, 'honungsrutor'],
        ['ƍ', BEAM15_CAP, 'ljusstråksrutor'], ['ƞ', BEEHIVE15_CAP, 'bikupor'], ['Ƨ', FOUNTAIN16_CAP, 'fontäner'], ['Ʃ', FALSEDOOR16_CAP, 'falska dörrar'],
        ['ƥ', THORN16_CAP, 'taggranksrutor'], ['Ʀ', MIST16_CAP, 'dimrutor'], ['Ƴ', DREAMFLASK16_CAP, 'drömflaskor'], ['ƣ', SHIFT16_CAP, 'glidande väggar']])
        if ((nCh[c] || 0) > lim) errs.push('för många ' + what + ': ' + nCh[c]);
      for (const c of FOES1516_CH) if (FOES1516[c][2] && (nCh[c] || 0) > FOES1516[c][2]) errs.push('för många ' + c + ': ' + nCh[c]);
      if ((nCh['ƞ'] || nCh['Ƴ']) && (A || level.maze || level.secret)) errs.push('bikupa/drömflaska i en arena/labyrint/hemlig våning');
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const c = map[y][x], F = FOES1516[c];
        if (F) {
          if ((A || !F[0].includes(bio)) && !told[c]) { told[c] = 1; errs.push('fiende ' + c + ' hör inte hemma här (' + bio + (A ? ', arena' : '') + ') vid ' + x + ',' + y); }
          if (level.depth !== undefined && level.depth < F[1]) errs.push('fiende ' + c + ' på djup ' + level.depth + ' (minst ' + F[1] + ') vid ' + x + ',' + y);
          continue;
        }
        if (where[c] === undefined) continue;
        if (!where[c] && !told[c]) { told[c] = 1; errs.push('tecknet ' + c + ' hör inte hemma här (' + bio + ', ' + gb + ') vid ' + x + ',' + y); }
        if ((c === 'ƍ' || c === 'Ɩ' || c === 'ƥ' || c === 'Ʀ') && [0, 1, 2, 3].some(d => isDoorCh(at(x + DX[d], y + DY[d])))) errs.push('golvrutan ' + c + ' i dörröppning vid ' + x + ',' + y);
        if (c === SHIFT16) { // den glidande väggen: aldrig i kanten, aldrig intill en dörr/grind/hemlig vägg (de åtta grannarna)
          if (x === 0 || y === 0 || x === W - 1 || y === H - 1) errs.push('glidande vägg i kanten vid ' + x + ',' + y);
          if (RX.some((dx, k) => isDoorCh(at(x + dx, y + RY[k])))) errs.push('glidande vägg intill en dörr vid ' + x + ',' + y);
        }
      }
    }
    // version 16: level.shifts = [{ x, y, ph }] stämmer exakt med de glidande väggarna ƣ på kartan (fas 0-3.9 s); med alla ƣ uppe (som vägg) nås allt,
    // se nåbarheten nedan (ƣ är en vägg)
    if (level.shifts !== undefined || nCh[SHIFT16]) {
      const sh = level.shifts;
      if (!Array.isArray(sh)) errs.push('glidande väggar ƣ utan level.shifts (eller ogiltigt level.shifts)');
      else {
        const seen = new Set();
        for (const sw of sh) {
          const { x, y, ph } = sw || {};
          if (!Number.isInteger(x) || !Number.isInteger(y) || typeof ph !== 'number' || !(ph >= 0 && ph <= 3.9 + 1e-9)) { errs.push('glidande väggen är ogiltig: ' + JSON.stringify(sw)); continue; }
          if (at(x, y) !== SHIFT16) errs.push('level.shifts pekar på "' + at(x, y) + '" vid ' + x + ',' + y);
          if (seen.has(y * W + x)) errs.push('glidande väggen finns två gånger vid ' + x + ',' + y);
          seen.add(y * W + x);
        }
        if (seen.size !== (nCh[SHIFT16] || 0)) errs.push('level.shifts har ' + seen.size + ' väggar men kartan har ' + (nCh[SHIFT16] || 0) + ' ƣ');
      }
    }
    // version 14: arenarum. Rektangeln (inre rutor x0..x1, y0..y1, minst 5x5) inom kartan, väggar runt om utom dörröppningarna (som alla står i
    // doors, ligger i kanten och är fria), 2-3 vågor, aldrig P, x, vaktaren Z eller nyckeln } i arenan; med dörrarna stängda kommer man inte ut
    if (level.arenas !== undefined) {
      const ars = level.arenas;
      if (!Array.isArray(ars)) errs.push('level.arenas ogiltigt');
      else for (const a of ars) {
        const { x0, y0, x1, y1, doors, waves } = a || {}, tag = 'arenan ' + JSON.stringify(a && { x0, y0, x1, y1 });
        if (![x0, y0, x1, y1].every(Number.isInteger) || x0 < 1 || y0 < 1 || x1 > W - 2 || y1 > H - 2 || x1 - x0 < 4 || y1 - y0 < 4) { errs.push(tag + ' ligger inte inom kartan / är mindre än 5x5'); continue; }
        if (waves !== 2 && waves !== 3) errs.push(tag + ' har ' + waves + ' vågor (2 eller 3)');
        if (!Array.isArray(doors) || !doors.length) { errs.push(tag + ' saknar dörrar'); continue; }
        const dset = new Set();
        for (const d of doors) {
          const { x, y } = d || {};
          const edge = Number.isInteger(x) && Number.isInteger(y) && (((x === x0 - 1 || x === x1 + 1) && y >= y0 && y <= y1) || ((y === y0 - 1 || y === y1 + 1) && x >= x0 && x <= x1));
          if (!edge) { errs.push(tag + ': dörren ' + x + ',' + y + ' ligger inte i rummets kant'); continue; }
          const c = at(x, y);
          if (isWall(c) || (c !== 'D' && c !== 'G' && isBlock(c)) || '*|]{'.includes(c)) errs.push(tag + ': dörröppningen ' + x + ',' + y + ' är inte öppen ("' + c + '")');
          dset.add(y * W + x);
        }
        for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if ('Px}Z'.includes(map[y][x])) errs.push(tag + ' innehåller ' + map[y][x] + ' vid ' + x + ',' + y);
        // version 16: ingen glidande vägg i arenans kant (den skulle öppna arenan halva tiden)
        for (let y = y0 - 1; y <= y1 + 1; y++) for (let x = x0 - 1; x <= x1 + 1; x++) if ((x < x0 || x > x1 || y < y0 || y > y1) && at(x, y) === SHIFT16) errs.push(tag + ' har en glidande vägg i kanten vid ' + x + ',' + y);
        // med dörrarna som vägg: flood fill från arenans rutor når aldrig utanför rektangeln
        const seen = new Uint8Array(W * H), st = [];
        for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (!isWall(map[y][x])) { seen[y * W + x] = 1; st.push(y * W + x); }
        let leak = null;
        while (st.length && !leak) {
          const i = st.pop(), x = i % W, y = (i / W) | 0;
          for (let d = 0; d < 4; d++) {
            const nx = x + DX[d], ny = y + DY[d], j = ny * W + nx;
            if (seen[j] || isWall(at(nx, ny)) || dset.has(j)) continue;
            if (nx < x0 || nx > x1 || ny < y0 || ny > y1) { leak = [nx, ny]; break; }
            seen[j] = 1; st.push(j);
          }
        }
        if (leak) errs.push(tag + ' är inte sluten: öppning utan dörr vid ' + leak[0] + ',' + leak[1]);
      }
    }
    return errs;
  }

  window.Gen = { floor, boss, secret, maze, validate, THEMES, BOSS_THEMES, BIOMES, GUARDIANS, ARCHES: Object.keys(ARCH).concat(SET14_ID), WEAPONS, ARENAS: ['hall'].concat(Object.keys(ARENAS)) };
})();
