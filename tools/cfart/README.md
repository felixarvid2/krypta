# AI-texturer (Cloudflare Workers AI)

Järnfängelsets väggar, cellgaller och golv (variant A) är gjorda med `@cf/black-forest-labs/flux-2-dev` på Cloudflare Workers AI och efterbehandlade lokalt till spelets storlek och palett.

- `prison_a/`: de färdiga texturerna. Samma filer ligger i `assets/wall/`.
  - `wall_prisonstone.png` 64×128
  - `wall_cellbars.png` 64×128
  - `floor_prison.png` 64×64 (används också som tak)
- `tools/props18/make.py` hoppar över de här tre namnen (`CFART`), så att en ny körning inte skriver över dem. Halmen (`floor_straw`) är fortfarande den handgjorda.
- `battlefield_a/`: det eviga slagfältet. Samma filer ligger i `assets/`.
  - `sky_battlefield.png` 512×96 (`assets/gfx/`): en egen himmel för biomen. Spelet läser `gfx/sky_<biom>.png` om den finns och ritar då ingen måne, inga nattmoln och inga stjärnfall ovanpå.
  - `floor_battlemud.png` och `floor_trench.png` 64×64 (`assets/wall/`). `tools/props20/make.py` hoppar över dem (`CFART`).
- `cf.py`: anropar Cloudflare. Kräver `CF_ACCOUNT_ID` i miljön. Nyckeln läggs in av nätverksproxyn eller skickas som `Authorization: Bearer`.
- `process.py`: efterbehandlingen. Rådata från Cloudflare finns inte i repot.
  1. Klipper ut en hel period av mönstret (autokorrelation).
  2. Korsblandar kanterna så att texturen blir sömlös.
  3. Skalar ner med LANCZOS.
  4. Matchar ljusstyrkan mot den gamla texturen.
  5. Kvantiserar mot färgerna i biomens befintliga texturer, med 4×4 Bayer-dither och högst 40 färger.

## Prompter

Prompterna för slagfältets himmel, lera och skyttegrav finns i sessionens anteckningar och inte här. Himlen gjordes av två bilder som skarvades till ett 360°-panorama.

Alla bilder är 1024×1024.

- **Vägg:** "Seamless tileable texture for a 1990s retro first-person shooter, flat orthographic front view of a damp dungeon prison wall made of a few large rough grey stone blocks, about four courses of big blocks, thick dark mortar, rust streaks and grime, low resolution hand-painted pixel art, limited 256 colour palette, gritty, evenly lit, no perspective, no shadows from a light source, no text"
- **Golv:** "Top-down orthographic view of a dungeon prison floor: worn square grey flagstones in a grid, cracked edges, dark grime in the joints, damp stains, seamless tileable texture for a 1990s retro first-person shooter, low resolution hand-painted pixel art, limited 256 colour palette, gritty and grainy, evenly lit, no perspective, no text"
- **Cellgaller:** "Flat orthographic front view of a rusty wrought iron prison cell gate: evenly spaced thick vertical iron bars with two riveted horizontal crossbars, pitch dark cell interior behind the bars, orange rust patches, seamless tileable texture for a 1990s retro first-person shooter, low resolution hand-painted pixel art, limited 256 colour palette, gritty and grainy, evenly lit, no perspective, no text"
