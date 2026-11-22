# Vapenbildrutor

Förstapersonsvapnen i Krypta är renderade ur **RetroWeaponPack_V1.zip** (release `assets-large-v1`) i
Doom/Quake 1-stil: inga händer, bara vapnet som sticker rakt fram från skärmens nederkant.
Vapnet riktas upp så att pipan pekar rakt in i bilden, kameran står snett bakom och ovanför, och
paketets egna `*_Fire`-animationer ger slide- och pumprörelsen. Rekyl, vapenbyte och omladdning görs i spelet.

```bash
cd retrofps/tools/weapon-frames
npm i three playwright-core
unzip RetroWeaponPack_V1.zip 'Assets/RetroWeaponsPack/*' -d guns   # zippen från releasen
node render.mjs all qframes    # renderar 960x498-bildrutor + mynningspositioner
python3 pack.py qframes,xframes # skalar och placerar i 320x166-vyn, skriver assets/gfx/fp_*.png + js/weapons.js
```

Dubbelbössan, armborsten, signalpistolen och prickskyttegeväret är statiska modeller ur `assets/3d-models`
(PSX Shotgun Pack, Kickin It Studios Low Poly Weapon Pack och Guns&Explosives) utan armrigg. De renderas med
`render-static.mjs` och `static.html`: `static-defs.json` anger modell, textur, vridning (`rot`, `tilt`, `meshRot` för delar
som är modellerade i ett annat läge, som signalpistolens uppfällda pipa) och kamera. Rekylen ritas fram genom att vapnet
knuffas bakåt och nosen lyfts.

```bash
node render-static.mjs side      # sidovyer side_<vapen>.png: pipan ska peka åt höger och ovansidan uppåt
node render-static.mjs fp        # xframes/ med vilobild, sju rekylrutor och meta.json
python3 pack.py qframes,xframes  # packar alla åtta vapnen
```

Kamerans placering per vapen står i `render.mjs` och `static-defs.json` (`cam`), storlek och placering på skärmen i `pack.py` (`TARGET`).
`render.mjs` letar efter Chromium i `/opt/pw-browsers/chromium`; ändra `executablePath` om din ligger någon annanstans.

Version 5: stridsyxan (`axe`, KayKit Fantasy Weapons Bits `axe_A`, CC0), eldkastaren (`flamer`) och granattillsatsen
(`launcher`). Eldkastaren är hopbyggd i `static-defs.json` med `parts`: röret är Guns&Explosives `Pipe_Bomb` (utsträckt med
`stretch`), tanken, banden, munstycket och tändlågan är enkla former. Granattillsatsen är PSX-paketets avsågade enpipiga
hagelgevär med ett grovt rör (`parts`). `nozzle` anger vilken del mynningen räknas från. Yxan använder `melee`: en vilopose
och åtta svingposer (hand och vinklar) från övre högra hörnet ned mot vänster; pack.py lägger dem i vyn som de renderats
(`native`) i stället för att skala dem till en målhöjd. De nya vapnen får hel eller ingen täckning per pixel.

```bash
node render-static.mjs fp axe,flamer,launcher
node render-static.mjs side axe,flamer,launcher
python3 pack.py xframes ../../ axe,flamer,launcher   # packar bara dessa, övriga poster i js/weapons.js lämnas orörda
python3 pack.py pick ../../ axe,flamer,launcher      # pick_<vapen>.png ur sidovyerna
```

Version 6: spikgeväret (`nailgun`), blixtstaven (`staff`) och långbågen (`bow`).
Spikgeväret är hopbyggt i `static-defs.json` (`parts`): kroppen är Guns&Explosives `Pipe_Bomb` (utsträckt och mörkt tonad),
fyra pipor, mässingsringar och en kopparskena är enkla former; rekylen är tre korta rutor. Staven är KayKit `staff_B` (CC0) i
närstridsläget `melee`: `split` lyfter ut kristallen ur modellen efter texturfärgen och `glow` per pose gör den självlysande
(1) eller vitblå (2) och förstorar den (`scale`) när staven avfyras; mynningen är kristallen. Bågen är KayKit `bow_A` med
`bow`: strängen (två tunna cylindrar till nockpunkten) och pilen `arrow_A` byggs i `static.html` och spänns med `draw` (0–1).
Bågen har tre lägen: `idle` (avspänd med pil), `fire` (släppt, strängen dallrar, ingen pil) och `draw` i `melee.extra`
(fyra rutor från avspänd till fullt spänd, `durs.draw` anger längden). I `js/weapons.js` blir det
`states: {idle:[0], fire:[1..4], draw:[5..8]}` och `dur: {fire, draw}`; mynningen för `fire` är pilspetsen i vilobilden.
`clipBack` skär bort vapnets bakre del med ett klipplan och `"tex": "./..."` pekar på en egen textur i den här mappen.

```bash
node render-static.mjs fp nailgun,staff,bow
node render-static.mjs side nailgun,staff,bow
python3 pack.py xframes ../../ nailgun,staff,bow   # övriga poster i js/weapons.js lämnas orörda
python3 pack.py pick ../../ nailgun,staff,bow      # bågens upplockningsbild får en ritad sträng
```

Version 7: kastknivarna (`knives`), stridshammaren (`hammer`) och musköten (`musket`).
Knivarna är tre KayKit `dagger_A` (CC0) i en solfjäder till höger om mitten: `fan` i `static-defs.json` gör `n` kopior av
modellen, `spread` lägger dem ([dx,dy,dz,rx,ry,rz] i andelar av modellens längd och grader) och per bildruta kan
`melee.fan` dölja (`hide`) eller flytta (`move`) en kopia. Skjutrutorna är kastet: armen tar sats, den mittersta kniven far
iväg, den saknas och en ny dras upp underifrån; mynningen är den mittersta kniven (`nozzle: knife0`).
Hammaren är KayKit `hammer_A` i närstridsläget: åtta rutor där den lyfts över huvudet och slås ned mitt i bilden, och ett
extra läge `charge` (tre rutor, hammaren hålls högt). I `js/weapons.js` blir det `states: {idle:[0], fire:[1..8], charge:[9..11]}`
och `dur: {fire, charge}`.
Musköten är PSX-paketets `OneBarrelShotgun` med längre pipa, mynning och två mässingsband (`parts`); rekylen är sex tunga rutor
och `pack.py` ritar en grå krutrök vid mynningen in i skjutrutorna (`SMOKE`, rutan växer uppåt så att röken får plats).

```bash
node render-static.mjs fp knives,hammer,musket
node render-static.mjs side knives,hammer,musket
python3 pack.py xframes ../../ knives,hammer,musket   # övriga poster i js/weapons.js lämnas orörda
python3 pack.py pick ../../ knives,hammer,musket      # knivarnas upplockningsbild är tre knivar i en solfjäder
```
`render-static.mjs` hittar `assets/3d-models` även när `retrofps` är en symlänk (den provar också `$PWD/../../../assets`).


Version 8: harpungeväret (`harpoon`), bumerangen (`boomerang`) och prismat (`prism`).
Harpungeväret är Guns&Explosives `Shotgun` med KayKit `spear_A` (CC0) som harpun längs pipan, en linrulle och en lina av
enkla former (`parts`). Nytt i `static.html` är `partPose` per bildruta, `{delnamn: {hide, show, move, rot, scale, emissive}}`,
som döljer, flyttar eller tänder namngivna delar efter att bilden centrerats (så att utsnittet står still), och `hidden` på
en del som bara syns där en ruta visar den. Skjutrutorna döljer harpunen och `pack.py` ritar repet från mynningen mot
`AIM` (`ROPE`). Skjutvapen kan nu också ha fler lägen med `extra` (som närstridens `melee.extra`): harpunens `reload` är
fem rutor där geväret lutas och harpunen glider tillbaka i pipan. I `js/weapons.js` blir det
`states: {idle:[0], fire:[1..5], reload:[6..10]}` och `dur: {fire, reload}`.
Bumerangen har ingen modell (`"model": "none"`, en osynlig ruta `base` ger måttet): bumerangen och en handskklädd hand med
ärm är enkla former. Den hålls i närstridsläget; skjutrutorna är kastet (armen tar sats, bumerangen släpps och försvinner,
`partPose: {boom: {hide: true}}`) och läget `empty` (`melee.extra`) är handen utan bumerang medan den är i luften:
`states: {idle:[0], fire:[1..4], empty:[5]}`. `sidePose` döljer handen och `sideYaw` vrider sidovyn till upplockningsbilden.
Prismat är Guns&Explosives `Suomi_KP` (trummagasinet dolt med `hide`) med en stor kristall (`"prim": "oct"`, utdragen med
`stretch`) i en mässingsklo vid mynningen och kristallceller i stället för magasinet; skjutrutorna tänder kristallen
(`emissive`, `scale`) och `pack.py` ritar en ljusblixt med regnbågsstrålar vid mynningen (`FLASH`).

```bash
node render-static.mjs fp harpoon,prism,boomerang
node render-static.mjs side harpoon,prism,boomerang
python3 pack.py xframes ../../ harpoon,prism,boomerang   # övriga poster i js/weapons.js lämnas orörda
python3 pack.py pick ../../ harpoon,prism,boomerang      # upplockningsbilderna pick_harpoon/_prism/_boomerang
```

Version 9: sågbladskastaren (`sawlauncher`), vindbössan (`windgun`) och spjutet (`spear`).
Sågbladskastaren är Guns&Explosives `GreaseGun` (mässingstonad) med en liggande sågklinga ovanpå (två åttakantiga
`cyl` vridna 22,5° mot varandra ger tänderna, `name: saw`), en mässingskåpa och en skena. Skjutrutorna döljer klingan och
`pack.py` ritar klingan som snurrar iväg mot `AIM` (`SAWFLY`); läget `reload` (`extra`) sänker ned en ny klinga ovanifrån:
`states: {idle:[0], fire:[1..5], reload:[6..9]}`, `dur: {fire, reload}`.
Vindbössan är Guns&Explosives `Luger` (mässingstonad) med ett mässingsrör, en utsvängd tratt (`cyl` med olika radier,
`open`) och en blåsbälg av lädersektioner (`name: bellows`) som trycks ihop i skjutrutorna (`partPose scale`); `pack.py` ritar
luftstöten vid trattmynningen (`GUST`): `states: {idle:[0], fire:[1..5]}`.
Spjutet är KayKit `spear_A` (CC0) i bumerangens hand (`model: none`, närstrid). `fire` är en stöt framåt, `throw`
(`melee.extra`) är kastet (armen tar sats, spjutet släpps och döljs) och `empty` är den tomma handen när spjutet ligger
på marken: `states: {idle:[0], fire:[1..4], throw:[5..8], empty:[9]}`, `dur: {fire, throw, empty}`. `pack.py` tar nu
även läget `throw` (före `empty`).

```bash
node render-static.mjs fp sawlauncher,windgun,spear
node render-static.mjs side sawlauncher,windgun,spear
python3 pack.py xframes ../../ sawlauncher,windgun,spear   # övriga poster i js/weapons.js lämnas orörda
python3 pack.py pick ../../ sawlauncher,windgun,spear      # pick_sawlauncher/_windgun/_spear
```

Version 11: sporkastaren (`sporelauncher`), spegelskölden (`mirrorshield`) och piskan (`whip`).
Sporkastaren har ingen modell (`"model": "none"`): en rundad svampkanon byggd av enkla former, kolv och pistolgrepp av trä,
en mässingskammare, ett grovt rör med mässingsringar, en lila svamphatt med vita prickar över röret (`name: cap`), en utsvängd
mässingsmynning (`name: muzzle`, mynningen) och en grön sporburk på kolven (`name: jar`) som lyser upp i skjutrutorna
(`partPose emissive`). `pack.py` ritar sporpuffen vid mynningen och sporbollen på väg mot `AIM` (`SPOREFLY`). Läget `reload`
(`extra`) lutar kanonen, lyfter ur burken och sätter i en ny: `states: {idle:[0], fire:[1..5], reload:[6..10]}`, `dur: {fire, reload}`.
Spegelskölden är två renderingar i närstridsläget: `mirrorshield` är ett kort svärd (KayKit `sword_B`, CC0) i spjutets hand och
`mirrorshield_s` är den runda spegelskölden (skiva, guldkant, ljusa reflexer och en buckla av enkla former) på vänster underarm.
`pack.py` lägger sköldrenderingen över varje ruta i samma läge (`MERGE`), så båda måste ha lika många rutor per läge.
`fire` är ett slag från höger till vänster och `block` (`melee.extra`) lyfter upp skölden mitt framför kameran (sista rutan
är den hållna posen): `states: {idle:[0], fire:[1..5], block:[6..8]}`, `dur: {fire, block}`. `pack.py` tar nu läget `block`
(efter `empty`), och upplockningsbilden tas ur sköldens sidovy (`PICK_SIDE`).
Piskan är ett skaft av läder med mässingsringar i spjutets hand och en hoprullad snärt (`name: coil`, tre torusar) som döljs i
skjutrutorna; `pack.py` ritar själva snärten från skaftets spets (`nozzle: tip`) ut i bilden (`LASH`): slängd bakåt, en båge
framåt, utsträckt mot `WAIM` med en smäll, en våg tillbaka och fallande: `states: {idle:[0], fire:[1..5]}`, `dur: {fire}`.

```bash
cd retrofps/tools/weapon-frames     # via symlänken, så att render-static.mjs hittar assets/3d-models
node render-static.mjs fp sporelauncher,mirrorshield,mirrorshield_s,whip
node render-static.mjs side sporelauncher,mirrorshield,mirrorshield_s,whip
python3 pack.py xframes ../../ sporelauncher,mirrorshield,whip   # övriga poster i js/weapons.js lämnas orörda
python3 pack.py pick ../../ sporelauncher,mirrorshield,whip      # pick_sporelauncher/_mirrorshield/_whip
```

Version 13: runboken (`runebook`) och ångkanonen (`steamcannon`).
Runboken har ingen modell (`"model": "none"`): en öppen grimoar av enkla former (två läderpärmar i ett grunt V, tjocka
sidblock, guldhörn, ett bokmärke och gyllene runstreck, `name: rune`, som tänds med `partPose emissive`) som vilar i en
handskklädd hand med ärmen bakåt mot kameran. Den hålls i närstridsläget; mynningen är sidornas mitt (`nozzle: pages`).
`fire` lyfter och tänder boken och `pack.py` ritar runan (en lysande skiva med ett tecken) som far mot `AIM` (`RUNEFLY`).
Läget `ward` (`melee.extra`, tre rutor, den sista är den hållna posen) lyfter upp boken mitt framför kameran och `pack.py`
ritar en virvel av lösa sidor runt den (`WARD`, effekten ritas nu även i andra lägen än `fire`, `steps_for(tab, 'ward')`):
`states: {idle:[0], fire:[1..4], ward:[5..7]}`, `dur: {fire, ward}`. Upplockningsbilden `pick_runebook.png` ritas i
`tools/props10/make.py` (sidovyn visar bara bokens kant).
Ångkanonen är byggd av enkla former: kolv och pistolgrepp av trä, en kopparpanna med järnband, en mässingspipa med
kopparband och en utsvängd mynning (`name: muzzle`), en tryckmätare ovanpå med en visare (`name: needle`, vriden med
`partPose rot`), en röd ventil (`name: valve`) och en hoprullad slang. `pack.py` ritar ångmolnet ur mynningen (`STEAMFX`);
`reload` (`extra`) lutar kanonen, vrider ventilen och låter visaren stiga: `states: {idle:[0], fire:[1..5], reload:[6..10]}`,
`dur: {fire, reload}`.

```bash
cd retrofps/tools/weapon-frames     # via symlänken, så att render-static.mjs hittar assets/3d-models
node render-static.mjs fp runebook,steamcannon
node render-static.mjs side runebook,steamcannon
python3 pack.py xframes ../../ runebook,steamcannon   # övriga poster i js/weapons.js lämnas orörda
python3 pack.py pick ../../ steamcannon               # pick_steamcannon (pick_runebook kommer från tools/props10)
```

Version 15: rökelsekaret (`censer`) och bikastaren (`hivelauncher`).
Rökelsekaret har ingen modell (`"model": "none"`, `base: [2,2,2]` så att greppet hamnar i origo och längden blir känd): ett
mässingskar (klot, band, kupat lock med knopp, `name: pot`, mynningen) i en kedja av omväxlande vridna torusar, med glöd
(`name: ember`) i hålen. Handen med ärmen är en egen rendering, `censer_h`, som `pack.py` lägger över varje ruta (`MERGE`, som
spegelskölden), så att karet kan snurra runt handen utan att ärmen följer med. `fire` är ett helt varv (åtta rutor): karet
lyfts, svänger ut framför, runt åt vänster, svischar förbi tätt framför kameran och kommer tillbaka från höger; `pack.py` ritar
en röksvans längs karets tidigare lägen (`CENSERFX`): `states: {idle:[0], fire:[1..8]}`, `dur: {fire}`. Ställningarna anges
som handens läge och kedjans riktning; vinklarna räknas fram i `tools/props12/fp_defs.py`.
Bikastaren är byggd av enkla former: kolv och grepp av trä, en bikupa av trästavar med mässingsband och ett litet tak
(`name: lid`), en vaxad front med sexkantiga celler (`name: comb`, lyser i skjutrutorna), honungsdroppar och en mässingspipa med
utsvängd mynning. `pack.py` ritar bina som surrar ut ur pipan mot `AIM` (`BEEFLY`); `reload` (`extra`) lutar kastaren och lyfter
taket: `states: {idle:[0], fire:[1..5], reload:[6..10]}`, `dur: {fire, reload}`. Upplockningsbilderna `pick_censer.png` och
`pick_hivelauncher.png` ritas i `tools/props12/make.py`.

```bash
cd retrofps/tools/weapon-frames
node render-static.mjs fp censer,censer_h,hivelauncher
python3 pack.py xframes ../../ censer,hivelauncher   # censer_h läggs över censer (MERGE); övriga poster i js/weapons.js lämnas orörda
```

Version 16: trädgårdssaxen (`shears`) och drömstaven (`dreamstaff`).
Båda har ingen modell (`"model": "none"`, `base: [2,2,2]` som rökelsekaret, så att greppet hamnar i origo) och hålls i
närstridsläget. Saxen är två stålblad med slipad egg, träskaft med mässingshylsor och en mässingsbult i en handskklädd hand
med en mossgrön ärm. Den övre halvan (bladet, skaftet och hylsan, `name: sb0`–`sb5`) vrids stelt kring bulten per bildruta:
`static.html` vrider varje del kring sin egen mittpunkt (`partPose.rot`), så `tools/props13/fp_defs.py` ger varje del en egen
rotation kring bultens axel och den förflyttning (`move`) som för dess mittpunkt runt bulten. `fire` är ett snabbt dubbelklipp
(sex rutor: upp, klipp, upp, klipp, tillbaka) och `pack.py` ritar ett vitt blänk där eggarna möts i klipprutorna (`SNIP`);
`throw` (`melee.extra`, fyra rutor) tar sats och kastar saxen (döljs, `hide`) och `empty` är den tomma handen medan saxen är i
luften: `states: {idle:[0], fire:[1..6], throw:[7..10], empty:[11]}`, `dur: {fire, throw, empty}`.
Drömstaven är ett mörklila skaft med guldringar, en månskära av sfärer och en femuddig stjärna (fem koner kring en kula,
`name: star`, mynningen) som lyser upp och växer i skjutrutorna (`partPose emissive`, `scale`); `pack.py` ritar stjärnan som
flyger mot `AIM` med ett lila stoftspår (`STARFLY`). `reload` (`extra`) lutar staven, släcker stjärnan och tänder den igen:
`states: {idle:[0], fire:[1..4], reload:[5..9]}`, `dur: {fire, reload}`. Upplockningsbilderna `pick_shears.png` och
`pick_dreamstaff.png` ritas i `tools/props13/make.py`.

```bash
python3 tools/props13/fp_defs.py /tmp/defs16.json   # ger posterna shears och dreamstaff (läggs in i static-defs.json, json indent 1)
cd retrofps/tools/weapon-frames
node render-static.mjs fp shears,dreamstaff
python3 pack.py xframes ../../ shears,dreamstaff   # övriga poster i js/weapons.js lämnas orörda
```
