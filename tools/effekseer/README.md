# Effekseer → spritestrippar

Effekseer (https://effekseer.github.io, MIT) är ett partikelverktyg. Här används det bara offline: effekterna spelas upp i
EffekseerForWebGL (wasm) i headless Chromium, fångas bildruta för bildruta och blir PNG-strippar som spelet ritar som
vanliga additiva sprites. Spelet innehåller ingen Effekseer-runtime. Källor och licenser: `CREDITS.md`.

## Kör om

```
sh tools/effekseer/fetch.sh                  # runtime (MIT) + exempeleffekter (CC0) till tools/effekseer/cache/
node tools/effekseer/render.mjs              # alla effekter i effects.json -> tools/effekseer/out/raw/<namn>/NNN.png
python3 -I tools/effekseer/process.py        # -> assets/gfx/efx_*.png och förhandsbilder i out/preview/
```

`render.mjs boom` och `process.py efx_boom.png` kör bara en effekt. `EFK_CACHE` och `EFK_OUT` byter katalogerna.
`cache/` och `out/` ignoreras av git. Kräver Playwright (`require('playwright')`), Chromium, Python med PIL och numpy.

Renderingen är deterministisk (fast tidssteg och slumpfrö per lager): två körningar ger byte-identiska strippar.

## Filer

- `fetch.sh` hämtar låsta commits av EffekseerForWebGL, ResourceData och Effekseer (bara för licenstexten) med anonym git.
- `render.html` är sidan som kör runtimen: WebGL utan antialias, svart bakgrund och `context.update(1)` per bildruta
  (60 bilder/s). Flera lager kan spelas samtidigt med fördröjning, position, skala och fart.
- `render.mjs` startar en liten lokal webbserver och Chromium och sparar bildrutorna.
- `effects.json`:
  - `effects` är vad som renderas: lager, kamera och antal bildrutor.
  - `strips` är hur det blir sprites: bildrutefönster, antal, storlek, läge och palett.
- `process.py` gör efterbehandlingen:
  1. väljer bildrutor,
  2. gör ett gemensamt utsnitt för hela strippen (teleporten står på nederkanten, eftersom partikelns z är spritens fot),
  3. skalar ned med ytmedelvärde,
  4. ditherar lätt med 4×4 Bayer,
  5. väljer palett: färg mot spelets eldfärger (`fire.png` och `fireball.png`), eller vitt mot sex gråsteg så att spelet färgar med `tint`,
  6. sätter alfa till 0 eller 255 (`drawSprite` hoppar över alfa under 100 och väger additiv färg med alfa).

## I spelet

Blocket `// ---------- Version 25: Effekseer-effekter ----------` i `js/game.js`:

- `efxLoad` laddar stripparna valfritt. Saknas en, används de gamla effekterna.
- `efxBoom` ritas från `explode`, alltså granater, krutfat och bomber.
- `efxMagic` ritas när ett magiskt skott slocknar eller träffar: stavens klot, runboken, drömstaven och fiendernas klot, blixtar, skallar och is. Den har skottets färg.
- `efxCharge` ritar laddningen, alltså magiträffen baklänges, i handen på magiska skyttar strax före skottet. Kroken sitter i `gfxETele`.
- `efxTele` ritas från `spawnPuff`: teleporter, portaler, framträdanden och försvinnanden. Små puffar (n < 4) får ingen pelare. Det får heller inte bli en ny pelare på samma ställe inom 0,4 s.
- En partikel per händelse går genom den vanliga listan. Det finns högst 10 samtidigt, och bara mellan 1 och 20 rutor från kameran (en additiv sprite tätt intill skulle fylla skärmen). Spelarens egen teleport syns därför inte som pelare, och den gamla blixten finns kvar.
- `lowfx` och det automatiska lågeffektläget stänger av alltihop. Med `noFlash` tonas explosionen in och ut och dämpas.
- Testkroken är `__game.efx`: `state()`, `setOff()`, `boom()`, `magic()`, `tele()` och `puff()`. Testet är `tools/playtest/t115.mjs`.

## Version 25.1: fler effekter

Sju nya strippar från samma CC0-exempel (källor i `CREDITS.md`, inställningar i `effects.json`): `efx_fire`, `efx_shatter`,
`efx_poison`, `efx_bolt`, `efx_slam`, `efx_portal` och `efx_heal`. Alla tio strippar är tillsammans cirka 51 kB.
`render.mjs fire` och `process.py efx_fire.png` kör en i taget som förut. `warm` i en effekt spelar de första bildrutorna utan
att fånga dem (eldfasen i `Simple_Ring_Shape2` kommer först efter 340 bildrutor).

Blocket `// ---------- Version 25.1: fler Effekseer-effekter ----------` i `js/game.js` (direkt efter version 25-blocket) lägger
till nycklarna i `EFX_FRAMES`, `EFX_NEAR` och `EFX.n`, så `efxLoad` laddar dem och `efxOk` gäller (högst 10 effektsprites,
1–20 rutor från kameran, lowfx). Varje krok är en egen rad:

- `efx2Status` (från `statusTick`): en brinnande fiende får lågan och en förgiftad fiende giftvirveln, ungefär en gång i sekunden.
- `efx2Ground`: brinnande mark (`groundFires`), flaskornas eld- och giftmoln (`v17clouds`), sporer och sporkastarens moln.
  Brand och gift ritas bara när högst 5 effektsprites lever (`EFX2.amb`), så de tränger inte ut träffar och explosioner.
- `efx2Shatter` (från `shatter`): en frusen fiende som dör.
- `efx2Zap` (från `zap`): blå strålar (blixtstaven, kedjeblixten, stormrunan, chocken, klotet), samma färgtest som `gfxEZap`,
  högst en per 0,12 s. `efx2Strike` (åsknedslagen i `strikes`): stormfågeln, kardinalen, stormkallaren, åskande eliter och stormstaven.
- `efx2Waves` (från `updateBossFx`): smällen där en bossvåg börjar (lavavågen, kolossen, rökelsekaret, leviatan).
- Skärmeffekter i HUD:en (`efx2Hud`, inga partiklar): portalen mitt i bilden (en ruta på en tredjedel av bildhöjden) när spelaren
  själv teleporteras (`spawnPuff` vid spelaren: teleporter, stjärnport, blink, tillbaka ur avgrunden) eller kommer genom en portal
  (`enterPortal`). Den gamla puffen i kameran, som fyllde skärmen, tas då bort; med lowfx finns den kvar. Helningen ritas vid
  hälsan när hälsan stiger med minst 3 inom 0,6 s (drycker, kallbad, livsstöld); stora hopp (ny bana) räknas inte.
- noFlash tonar och dämpar blixten, chockvågen och portalen.
- Testkroken är `__game.efx2`, testet `tools/playtest/t117.mjs` (`EFX_SHOTS=<katalog>` sparar före/efter-bilder).

## Version 27: chockvågen på marken och bossens smäll

Två nya strippar (källor i `CREDITS.md`, inställningar i `effects.json`), tillsammans cirka 19 kB:

- `efx_ring` (6 × 48×12, vit): `Simple_Ring_Shape1` sedd snett från sidan. Spelet låter ringen växa (`size` per bildruta) och färgar
  den som damm, så den blir en chockvåg längs golvet vid explosioner. Den ritas inte additivt, så den syns mot det upplysta golvet.
- `efx_burst` (12 × 64×64, färg): `ToonHit`, `Simple_SpawnMethod1` och ringen på marken. Den ritas när en boss byter fas, några gånger
  under dödsanimationen och stort när bossen dör (tillsammans med `efx_tele` i guld som en ljuspelare).

`render.mjs ring burst` och `process.py efx_ring.png efx_burst.png` gör om dem. `Simple_Turbulence_Fireworks` provades för gnistor,
men spåren blev för tunna efter nedskalningen, så gnistor, glitter och mynningsflammor ritas i kod i stället.

Blocket `// ---------- Version 27: FX ...` i `js/game.js` (före HUD-blocket) lägger till `ring` och `burst` i `EFX_FRAMES`, så `efxLoad` laddar
dem och `efxOk` gäller (högst 10 effektsprites, avståndsgränser, lowfx). Krokarna, var och en på en egen rad:

- `drawWeapon`: `fx27Muzzle` ritar mynningsflamman för vapnets typ (hagel, gevär, kpist, magi i vapnets färg, tunga vapen). Bilderna
  (tre per typ, 32×32) ritas i kod första gången de behövs. Den gamla `MuzzleFlash.png` ritas då genomskinlig i samma bildruta.
- `wpImpact`: `fx27Impact` förstärker nedslagen efter material, högst 3 per bildruta: gnista, heta gnistor som studsar och svalnar och
  en het fläck i metall; dammoln och ett stenskott i sten; snurrande flisor och sågdamm i trä; glitter i is och glas; stänk eller lava
  när ett lågt skott slår ned vid en vätska.
- `explode`: `fx27Boom` lägger till chockvågen på marken, en dammvåg, skräp som studsar (tre av bitarna ryker), glöd som falnar på
  golvet (gul → orange → röd → mörk) och rök som dröjer kvar i 4–6 s. I vatten blir det en kaskad och i lava ett lavastänk.
  Högst två rika smällar per 0,12 s (kedjor av krutfat). Delarna kommer en bildruta efter smällen, så att kärnan i alla smällar i
  samma bildruta (VAPEN och version 25) får sina platser först. Nära kameran blir ringen mindre (under 1,6 rutor ingen), dammvågen
  stannar före kameran och röken som dröjer kvar hoppas över under 2 rutor.
- `updateWeather`: `fx27Tick` sköter glöden som falnar, ringen som växer, skräpets rök och miljön: snö under fötterna (snö och frost),
  damm när man går i damm (springandet sköter VÄRLD), lava som fräser, gnistor från sågklingor, glöd från brinnande mark och glimmer
  från kistor och magiska föremål, och fiender som vadar i vatten stänker. Den läser också av bossarnas fas och död (fält `fx27*` på bossen, ingen krok i FIENDER).
- HUD:en: `fx27DrawHud` ritar chockvågen från bossen som en ring över skärmen, en färgpuls i kanterna (mitten och hårkorset lämnas fria)
  och en vit blixt när bossen dör.
- Allt nytt fyller partikellistan bara till 120 (`FX27_SOFT`); bossarnas smällar och effektsprites får gå till VAPENs hårda tak 215.
  Bossens smäll och ljuspelare krymper nära kameran (som version 25.1: avståndet minst 1,4 × storleken) eller hoppas över.
- Mynningsljuset i världen (`MUZZLE_COL`) får vapnets färg för hagel, de tunga vapnen och magin; med version 27 av är färgen som förut.
- `lowfx` (även den automatiska) stänger av allt nytt. `noFlash` dämpar mynningsflamman (svagare, ingen vridning), smällarna och
  skärmeffekterna och tar bort den vita blixten. `reduceMotion` tar bort ringen över skärmen.
- Testkroken är `__game.fx27` (`state()`, `setOff()`, `set({ muzzle, impact, boom, env, boss })`, `fixed()`, `muzzle(id)`, `boom()`, `impact()`,
  `step()`, `env()`, `phase()`, `final()`), testerna `tools/playtest/t140.mjs` (`FX27_SHOTS=<katalog>` sparar före/efter-bilder och flammorna) och `t141.mjs` (riktiga vapen, granatkastaren och en vanlig våning).

### Version 27, del 2: dödseffekter efter material och spår efter fiendeskotten

Blocket `// ---------- Version 27: FX del 2 ...` (direkt efter version 27-blocket) behöver inga nya bilder och ingen krok utanför
version 27: `fx27Tick` anropar `fx27Tick2`, som läser av fienderna och projektilerna.

- **Dödseffekter**: `fx27Mat` tolkar vad fienden är gjord av. Spöken, eld och kristall/is läses ur `e.d.sheet`, metall och slem ur
  version 23:s `gfxEKind`. Kött och ben ger `null` och lämnas åt BLOOD och version 23.
  - metall: gnistor som svalnar, rök, skruvar och kugghjul som studsar
  - spöken: en spiral av ljus som stiger, i spökets färg
  - slem: ett stänk och en ring i slemmets färg (pölen ritas redan av version 23)
  - kristall och is: skärvor som studsar och glitter (frusna fiender splittras redan i version 25.1)
  - eld: lågor, glöd som stiger och aska som singlar ned
  - En fiende som sprängs i bitar får ingen effekt i metall eller slem, eftersom version 23:s `gfxEGib` redan ritar bitarna.
- **Spår efter fiendeskotten** (`FX27_PT`): eldklot (och skott utan sort) ryker, magiska kulor får en gnistrande svans i skottets
  färg, pilar, spjut och knivar en tunn strimma, och syra, gift och sporer droppar. Spåren ritas bara inom 14 rutor, högst 12 per
  bildruta och bara när partikellistan har plats (120). Spelarens egna skott sköts som förut av VAPEN.
- Stjärnlansen ritar sin mynningsflamma när den släpps efter laddningen (`lanceFire`). Den saknades bara när testet anropade
  `fire()` direkt, eftersom lansen skjuter först när knappen släpps. Ingen ändring behövdes.
- Spärrarna är `FX27.f.kill` och `FX27.f.trails`. Testerna är `tools/playtest/t142.mjs` (material, spår, tak, lowfx, kostnad) och
  `t143.mjs` (stjärnlansen, blixtstaven och yxan, och en blandad strid mätt med och utan version 27).

### Version 27, del 3: statuseffekter, rök ur pipan och biomernas framträdanden

Blocket `// ---------- Version 27: FX del 3 ...` behöver inga nya bilder. `fx27Tick` anropar `fx27Tick3`, och allt läses av därifrån.

- **Statuseffekter** (`fx27Status`). De bygger vidare på FIENDER och V26B utan att dubblera dem:
  - bedövad: två fåglar som flaxar runt huvudet, åt andra hållet än FIENDERs stjärnor
  - vacklande (`staggerT`): en pulserande ring på golvet (en bildruta ur `efx_ring`) och en markör över huvudet som säger "avrätta mig"
  - frusen: isande ånga som sjunker och rimfrost som glimtar
  - förgiftad: gröna droppar och bubblor som spricker
  - brinnande: större lågor längre bort än FIENDERs 10 rutor (upp till 22), så att de syns på avstånd
  - jonglerad (`airZ`): fartlinjer under fienden när den stiger och över den när den faller
  - Fåglarna, ringen och markören är partiklar som följer fienden (`FX27.ov`, högst 6 fiender) och tas bort när statusen släpper.
- **Rök ur pipan** (`fx27Barrel`): efter ett tungt skott (`flash` ≥ 1,1 eller `kick` ≥ 1,8) ryker pipan i 1,9–2,5 s. Efter en lång
  salva fortsätter den ryka i 1,5 s när den varma pipan (VAPENs `WA.heat`) svalnar under 0,45. Röken är VAPENs egna rökslingor i
  skärmen (`waPuff`, taket 14). Vapnen i `WA_SMOKELESS` och närstridsvapnen ryker inte.
- **Framträdanden per biom** (`fx27Spawn`): fiender som dyker upp mitt i striden (FIENDERs `gBorn`: arenavågor, larm, bakhåll) får
  biomens framträdande ovanpå det mörka hålet. Indelningen står i `FX27_SPAWN`:
  - eld ur golvet: vulkanen, skärselden, gjuteriet
  - is: frost
  - slem: kloaken, träsket, laboratoriet, svamparna, bikupan
  - sand och rök: gravkammaren, öknen, gruvan, slagfältet, kyrkogården
  - kristallglitter: kristall, spegel, observatoriet, drömmen
  - löv: skogen, trädgården, djungeln
  - vattenstänk: hamnen, det sjunkna, skeppet, badhuset
  - Övriga biomer har bara FIENDERs hål och damm som förut.
- Spärrarna är `FX27.f.status`, `FX27.f.barrel` och `FX27.f.spawn`. Testet är `tools/playtest/t144.mjs`.
