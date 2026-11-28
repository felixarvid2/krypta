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

## Egna himlar för fler biomer (version 25.1)

Öknen, skärselden, molnborgen, vulkanen, djungeln och fiskeläget har fått egna himlar, som slagfältet. De är gjorda med `@cf/black-forest-labs/flux-1-schnell` (8 steg, 1024×1024) på Cloudflare Workers AI och efterbehandlade lokalt med `skies.py`.

- `skies/`: de färdiga panoramorna, 512×96. Samma filer ligger i `assets/gfx/sky_<biom>.png`. Biomnamnen är `desert`, `purgatory`, `sky` (molnborgen), `volcano`, `jungle` och `harbor`.
- Spelet läser dem i `loadAll`, i samma lista som slagfältet. Har biomen en egen himmel ritas varken måne, nattmoln eller stjärnfall (`skyOwn`). Vulkanens röda glödton i `skyPixel` läggs bara på natthimlen, så att den inte hamnar dubbelt.
- `skies.py`: efterbehandlingen. Kör `CFART_RAW=<rådata> python3 -I skies.py [biom ...]`. Rådata från Cloudflare finns inte i repot.
  1. Var bild beskärs till himlen. Dyner, berg, palmer och vattenmärken klipps bort.
  2. Små fläckar, som en sol, en måne, en fågel eller ett ljust sken, ersätts med en kraftigt suddad omgivning.
  3. Båda bilderna skalas till samma höjd och färgutjämnas radvis. De får alltså samma lodräta färgförlopp, så att det inte syns två 180°-halvor.
  4. Bilderna korsblandas i fogen och runt om (16 % av bredden), så att panoramat blir sömlöst över 360°.
  5. Panoramat skalas ner till 512×96. De 14 översta raderna lugnas, eftersom de speglas mot zenitfärgen när man tittar upp.
  6. Mättnad och ljusstyrka sätts. Medelluminansen blir 46–65, nära natthimlens 58,5, och zeniten blir mörkare än horisonten. Vulkanen och skärselden är mörkast, eftersom biomens färgton redan gör dem röda.
  7. Bilden kvantiseras till 32 färger med median cut och lätt Bayer-dither. Färgerna dras 30 % mot närmaste färg i biomens egna väggar och golv (`PAL` i skriptet).
- Fiskeläget bygger på en enda bild, som tonas runt om. Alla andra himlar bygger på två bilder.

### Prompter för himlarna

Alla prompter börjar med: "Sky only, filling the entire frame edge to edge, for a 1990s retro first-person shooter:". Vulkanens andra bild (`v_sky2`) hade dessutom "looking up," efter "Sky only,".

Alla prompter slutar med "hand-painted, gritty, muted dark colours". Förbuden, som "no sun, no moon, no ground", hjälper bara delvis med flux-1-schnell. Därför sköts resten vid beskärningen och fläckbytet.

- **Öknen** (`d_sky1` och `d_sky2`, samma prompt): "hot hazy desert dusk sky, thick ochre and rust-brown dust haze and wind-blown sand streaks in the lower half, darker dusty violet-brown sky at the top, long horizontal wisps of sandstorm, no sun, no moon, no bright spots, no ground, no dunes, no landscape, no birds"
- **Skärselden**
  - `p_sky2`: "hellish blood-red sky of purgatory, churning dark crimson and black smoke clouds lit from below by an orange fire glow, drifting embers and ash, darker almost black-red at the top, glowing fiery haze in the lower part, no sun, no moon, no ground, no landscape, no buildings, no figures"
  - `p_sky4`: "dramatic deep crimson sky, churning dark red and black smoke clouds lit from below by orange firelight, darker almost black-red at the top, glowing fiery haze in the lower part, empty sky without aircraft or birds, no sun, no moon, no ground, no landscape"
  - Den första bilden med samma prompt som `p_sky2` fick flygplan och användes inte. Ett försök med "nothing flying, no aircraft" stoppades av Cloudflares NSFW-filter (fel 8007).
- **Molnborgen** (`s_sky1` och `s_sky2`, samma prompt): "high above the clouds in a raging thunderstorm at night, towering dark slate-blue and grey storm clouds, faint pale lightning glow inside the clouds, darker deep blue-black at the top, empty sky without aircraft or birds, no sun, no moon, no ground, no landscape"
- **Vulkanen**
  - `v_sky1`: "night sky over an erupting volcano, thick billowing charcoal-grey ash and smoke clouds lit from below by a dull red-orange lava glow, glowing ember sparks, nearly black at the top, empty sky without aircraft or birds, no sun, no moon, no ground, no mountain, no landscape". Bara den övre delen användes, ovanför berget.
  - `v_sky2`: "Sky only, looking up, … dark night sky choked with thick billowing charcoal-grey volcanic ash and smoke clouds, their undersides lit by a dull red-orange glow, nearly black at the top, empty sky without aircraft or birds, no sun, no moon, no ground, no mountain, no landscape"
- **Djungeln**
  - `j_sky1`: "humid tropical night sky over a jungle, thick drifting green-grey mist and low steamy clouds, faint sickly green moonless glow in the haze, darker deep green-black at the top, empty sky without aircraft or birds, no sun, no moon, no trees, no ground, no landscape". Månen suddades bort.
  - `j_sky2`: "overcast humid tropical night sky, layers of thick drifting green-grey mist and low steamy clouds, darker deep green-black at the top, a black silhouette of jungle canopy treetops along the very bottom edge, empty sky without aircraft or birds, no sun, no moon, no stars". Palmerna klipptes bort.
- **Fiskeläget** (`h_sky1`): "cold foggy night sky over a northern sea, thick drifting grey-blue sea fog banks and low ragged mist, faint pale diffuse glow behind the fog, darker slate blue-black at the top, empty sky without aircraft or birds, no sun, no moon, no boats, no ground, no water"

Det blev 13 anrop: 12 bilder och ett avvisat anrop. Ingen gräns för kvoten nåddes.
