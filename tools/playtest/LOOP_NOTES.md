# Förbättringsloopens anteckningar

Loopen (`.claude/workflows/forbattra.js`) läser och skriver den här filen. Den är loopens minne mellan rundor:
backloggen säger vad som är känt men inte gjort, historiken vad som provats och hur det gick, och lärdomarna
vad nästa planerare ska tänka på. Håll den kort – ta bort det som är gjort ur backloggen.

## Backlogg (känt, inte åtgärdat)
- Arenavågor kan skapas på rutor som inte nås från spelaren (en känd biblioteksarena, frö `sw-library3`, djup 4, har en sluten ficka). Skapa bara fiender på rutor som nås från spelaren.
- `freeSpotFar(4,7)` hittade ingen plats för Stjärnskådaren i arenan `hall`; v19-koden har en egen reserv. Kontrollera andra bossar som använder `freeSpotFar`.
- Stjärnlansen använder hammarens laddgren (`WS.hcharge`) och darrar nära full laddning.
- `t75` (mycelmodern byter anfall: "idle") och `t76` (klockutmaningen, inbördes strid) är ostadiga i hela sviten. Avgör om det är spelet eller testet.
- Våningsbyten ger enstaka bildrutor på 1,2–1,5 s (Avgrunden, bossjakten). Profilera ett byte innan något ändras.
- Väktare (bossar som vaktar vanliga våningar) står för många dödsfall även på tidiga våningar.
- Ökenens ruinsalar är mörka.
- Ingen har lyssnat på ljuden från version 17–20; volymerna är satta efter LUFS-mätningar.

## Historik
- (före loopen) Björnsaxens radie 0,7 → 1,2 rutor; knivkastare 6 → 5, ödlekrigare 12 → 10 (mätt utan gudläge: cirkusen och djungeln svårast). Arenagaller stängs även när någon står i öppningen.

## Lärdomar
- Ett test som ställer en fiende precis på en gräns (t.ex. 1,2 rutor från en sax) går sönder när gränsen ändras – testa beteendet, inte konstanten.
- Kör aldrig hela sviten samtidigt som bottar eller andra agenter som ändrar arbetsträdet; använd `KRYPTA_ROOT` mot en fryst kopia (`git archive HEAD | tar -x -C <dir>`).
- Artefaktbygget måste provas med `tools/artifact/tart2.mjs` och `tartm.mjs` (telefon) före varje publicering.
