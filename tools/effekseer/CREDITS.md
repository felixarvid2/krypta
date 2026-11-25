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

Explosionen är alltså en egen komposition av tre CC0-lager (se `effects.json`), inte en färdig Effekseer-explosion.
Stripparna är efterbehandlade (utsnitt, nedskalning, Bayer-dither, palett från spelets `fire.png`/`fireball.png`
respektive en grå trappa), se `process.py`.

## Inte använda

- `tests/Resources/` i EffekseerForWebGL (`Blow1`, `Cure1`, `Arrow1` m.fl.): ingen egen licenstext för effekterna, så de används inte.
- `Release/Sample/` i Effekseer (t.ex. `01_NextSoft01/MagicMeteo`): bara `.efkproj` (editorns projektformat), som runtimen inte kan läsa.

Tack till Effekseer Project och tktk.
