# Effekseer-effekter i Krypta – källor och licenser

Effekseer används bara som offlineverktyg. Spelet innehåller inga Effekseer-filer och ingen Effekseer-runtime,
bara de färdiga spritestripparna i `assets/gfx/`.

## Verktyg

| Del | Källa | Licens |
|---|---|---|
| EffekseerForWebGL 1.70 (`effekseer.js`, `effekseer.wasm`) | https://github.com/effekseer/EffekseerForWebGL, commit `accb827e32e60d3986fe9924237ebe81d98b55f0`, `docs/` | MIT, © 2011 Effekseer Project (`LICENSE` i samma repo) |

Runtimen hämtas av `fetch.sh` till `cache/rt/` och följer inte med spelet.

## Effekter

Alla effekter kommer från Effekseers exempeleffekter i https://github.com/effekseer/ResourceData,
commit `446ed7ab17ffee65738aa470fff0dec3a7ee17e8`, katalogen `samples/`.

Licensen står i `docs/readme_sample.txt` i https://github.com/effekseer/Effekseer (commit `b5700082b49bc5f919610880dafddc90211a9a4e`):
"All the licenses of these effects are CC-0. We'd appreciate it if you could credit Effekseer and the contributor
somewhere in your works." Effekseers byggskript `release_tool.py` (rad 123–129) kopierar `ResourceData/samples` till
verktygets `Sample/` och lägger just den filen bredvid som `readme.txt`, så CC0-texten gäller dessa exempel.

| Stripp i spelet | Effekseer-effekt (sökväg i ResourceData) | Upphov | Licens |
|---|---|---|---|
| `assets/gfx/efx_boom.png` (explosion, 12 × 48×48) | sammansatt av `samples/00_Basic/Simple_SpawnMethod1.efkefc` (två gånger, skala 0,6 och 0,45, den andra 6 bildrutor senare) och `samples/02_Tktk03/ToonHit.efkefc` (skala 1,3), med texturer i `samples/00_Basic/Texture/` och `samples/02_Tktk03/Parts/` | Effekseer Project; bidragsgivaren tktk (`02_Tktk03`) | CC0 |
| `assets/gfx/efx_magic.png` (magiträff, 10 × 32×32, vit, färgas i spelet) | `samples/02_Tktk03/ToonHit.efkefc` | bidragsgivaren tktk (`02_Tktk03`) | CC0 |
| `assets/gfx/efx_tele.png` (teleport, 12 × 32×48, vit, färgas i spelet) | `samples/02_Tktk03/Light.efkefc` | bidragsgivaren tktk (`02_Tktk03`) | CC0 |
| `assets/gfx/efx_fire.png` (eld, 10 × 32×40, färg) – version 25.1 | `samples/00_Basic/Simple_Ring_Shape2.efkefc`, bara eldfasen (de första 340 bildrutorna spelas utan att fångas, `warm`), texturer i `samples/00_Basic/Texture/` | Effekseer Project (`00_Basic`) | CC0 |
| `assets/gfx/efx_shatter.png` (is som splittras, 12 × 48×48, vit, färgas isblå i spelet) – version 25.1 | `samples/02_Tktk03/ToonWater.efkefc` (stänket, bildruta 10–75), texturer i `samples/02_Tktk03/Parts/` | bidragsgivaren tktk (`02_Tktk03`) | CC0 |
| `assets/gfx/efx_poison.png` (gift, 12 × 32×48, vit, färgas grön i spelet) – version 25.1 | `samples/00_Version16/Aura01.efkefc`, texturer i `samples/00_Version16/Textures/` | Effekseer Project (`00_Version16`) | CC0 |
| `assets/gfx/efx_bolt.png` (blixt, 10 × 32×32, vit, färgas blåvit i spelet) – version 25.1 | `samples/00_Basic/Laser02.efkefc`, bara urladdningen i början (bildruta 2–16, före den stora ljusblixten) | Effekseer Project (`00_Basic`) | CC0 |
| `assets/gfx/efx_heal.png` (helning, 12 × 32×48, vit, färgas grön i spelet) – version 25.1 | `samples/00_Basic/Laser01.efkefc` | Effekseer Project (`00_Basic`) | CC0 |
| `assets/gfx/efx_portal.png` (portal, 12 × 48×48, vit, färgas lila i spelet) – version 25.1 | `samples/00_Basic/Simple_Distortion.efkefc` | Effekseer Project (`00_Basic`) | CC0 |
| `assets/gfx/efx_slam.png` (bossens chockvåg, 12 × 48×48, färg) – version 25.1 | sammansatt av `samples/00_Basic/Simple_Sprite_Fixed.efkefc` (skala 0,7, fart 2,5) och `samples/00_Basic/Simple_SpawnMethod1.efkefc` (skala 0,45) | Effekseer Project (`00_Basic`) | CC0 |

Explosionen och chockvågen är alltså egna kompositioner av CC0-lager (se `effects.json`), inte färdiga Effekseer-effekter.
Stripparna är efterbehandlade (utsnitt, nedskalning, Bayer-dither, palett från spelets `fire.png`/`fireball.png`
respektive en grå trappa), se `process.py`.

## Inte använda

- `tests/Resources/` i EffekseerForWebGL (`Blow1`, `Cure1`, `Arrow1` m.fl.): ingen egen licenstext för effekterna, så de används inte.
- `samples/00_Basic/Simple_Sprite_Directional.efkefc`: hänger sig i renderingen (headless Chromium med SwiftShader), så den används inte.
- `samples/00_Version16/*_HDR.efkefc` och `samples/03_Hanmado01/`: kräver HDR enligt sina `readme.txt`, så de används inte.
- `Release/Sample/` i Effekseer (t.ex. `01_NextSoft01/MagicMeteo`): bara `.efkproj` (editorns projektformat), som runtimen inte kan läsa.

Tack till Effekseer Project och tktk.
