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
