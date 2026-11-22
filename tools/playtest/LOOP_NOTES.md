# Förbättringsloopens anteckningar

Loopen (`.claude/workflows/forbattra.js`) läser och skriver den här filen. Den är loopens minne mellan rundor:
backloggen säger vad som är känt men inte gjort, historiken vad som provats och hur det gick, och lärdomarna
vad nästa planerare ska tänka på. Håll den kort – ta bort det som är gjort ur backloggen.

## Backlogg (känt, inte åtgärdat)
- Arenavågor kan bli mindre än planerat när få rutor nås från spelaren: reserven utan nåbarhetskrav i `arenaSpawnWave` körs bara om ingen fiende alls placerats. Låg prioritet.
- `freeSpotFar(4,7)` hittade ingen plats för Stjärnskådaren i arenan `hall`; v19-koden har en egen reserv. Kontrollera andra bossar som använder `freeSpotFar`.
- Stjärnlansen använder hammarens laddgren (`WS.hcharge`) och darrar nära full laddning.
- `t75` (mycelmodern byter anfall: "idle") och `t76` (klockutmaningen, inbördes strid) är ostadiga i hela sviten. Avgör om det är spelet eller testet.
- Våningsbyten ger enstaka bildrutor på 1,2–1,5 s (Avgrunden, bossjakten). Profilera ett byte innan något ändras.
- Väktare (bossar som vaktar vanliga våningar) står för många dödsfall även på tidiga våningar.
- Ökenens ruinsalar är mörka.
- Ingen har lyssnat på ljuden från version 17–20; volymerna är satta efter LUFS-mätningar.

## Historik
- (före loopen) Björnsaxens radie 0,7 → 1,2 rutor; knivkastare 6 → 5, ödlekrigare 12 → 10 (mätt utan gudläge: cirkusen och djungeln svårast). Arenagaller stängs även när någon står i öppningen.
- a.1: Arenavågor skapas bara på rutor som nås från spelaren (BFS med `walkableForEnemy` inom arenan, reserv till det gamla villkoret om vågen blir tom). Motiv: backloggen, eftersom mätningen inte visade sidfel, fastlåsningar eller tydliga balansavvikelser; frö `sw-library3` djup 4 har en sluten ficka. Utfall: incheckad ca1b26e; blindtestet `tl_a_1_1` grönt (0 av 18 fiender i fickan), ingen skuld.

## Lärdomar
- Ett test som ställer en fiende precis på en gräns (t.ex. 1,2 rutor från en sax) går sönder när gränsen ändras – testa beteendet, inte konstanten.
- Kör aldrig hela sviten samtidigt som bottar eller andra agenter som ändrar arbetsträdet; använd `KRYPTA_ROOT` mot en fryst kopia (`git archive HEAD | tar -x -C <dir>`).
- Ett krav med en konkret uppställning (frö, djup, plats för fickan) och ett räknebart utfall ("0 av N fiender i fickan") gav ett blint test som blev grönt direkt.
- Artefaktbygget måste provas med `tools/artifact/tart2.mjs` och `tartm.mjs` (telefon) före varje publicering.
