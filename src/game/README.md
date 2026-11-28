# src/game – källan till js/game.js

`js/game.js` är **genererad**. Den byggs av delarna här:

```
node tools/build-game.mjs            # bygger js/game.js
node tools/build-game.mjs --check    # kontrollerar att js/game.js stämmer (CI)
node tools/build-game.mjs --syntax   # kontrollerar att varje del är hela satser
```

Ändra alltid här, aldrig i `js/game.js`. Testerna (`tools/playtest/head.mjs`) bygger om filen själva om den inte stämmer, och CI (`deb.yml`) stoppar en push där den inte stämmer.

## Hur delarna fungerar

- **En enda funktion.** Hela spelet ligger i en funktion som anropas direkt: `(() => { … })();`. `0010_start.js` öppnar den och `0610_init.js` stänger den och startar spelet.
- **Sammanfogning.** Delarna sorteras efter namn och sätts ihop byte för byte. Därför fungerar funktioner och `let`/`const` precis som i en enda fil, oavsett vilken del de står i.
- **Ordningen spelar roll.** Kod som körs direkt på toppnivå (tabeller, `const` med beräknade värden) måste stå efter det den använder.
- **Nya delar.** Ge dem ett nummer mellan två befintliga, till exempel `0185_mitt_system.js` mellan 0180 och 0190. Byt inte namn på befintliga delar i onödan, eftersom det gör sammanslagningar svårare.
- **Var sitt block.** Arbetar flera agenter samtidigt ska var och en lägga sin kod i en egen ny del och bara lägga krokrader i andras delar.
- **Engelska texter.** Lägg dem i en egen fil, `tools/i18n/en/vNN_<namn>.json`, i stället för i `manual.json`, så att agenterna inte krockar.

## Delarna (i ordning)

| Del | Innehåll |
|---|---|
| 0010–0050 | start, inställningar, prestationer, laddning, ljud, vapentabell, runda och våningar, kollision, ljus, biomer, partikelbudget |
| 0060–0130 | rendering: `render`, `renderWorld` (golv och tak), `renderWalls`, `renderSprites`, `renderPost`, `drawSprite`, `drawWeapon` och vapengrafiken |
| 0140–0180 | Effekseer-effekter och version 27 FX |
| 0190–0230 | HUD, vapenuppgraderingar, eldkastarens ljus, `hurtEnemy` och `explode` |
| 0240–0300 | föremål, följeslagare, drycker, version 5–7, menyer, smyg, utmaningsrummet, faror och vägsökning |
| 0310–0380 | `update`, version 26A, `updateEnemy`, fiende-AI (version 24–26B), lobbar och partiklar |
| 0390–0450 | faror, menyer, inställningar, indata, startskärm, version 8–10 |
| 0460–0470 | bandesign: version 24 och 27 |
| 0480–0570 | version 11–23: biomer, fiender och bossar |
| 0580–0600 | version 27 BLOOD, fiendegrafik och version 26C |
| 0610 | start av spelet |
