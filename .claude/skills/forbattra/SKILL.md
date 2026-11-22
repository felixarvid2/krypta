---
name: forbattra
description: Kör Kryptas självförbättrande loop (mät → planera → bygg och testa → granska → slå ihop → lär). Använd när användaren vill att spelet förbättras stegvis, "kör loopen", "förbättra", eller vill mäta spelets tillstånd.
---

# Förbättringsloopen för Krypta

Loopen är ett sparat arbetsflöde, `.claude/workflows/forbattra.js`. Kör det med Workflow-verktyget:

```
Workflow({ name: 'forbattra', args: { rounds: 1, maxChanges: 2, full: false, focus: '' } })
```

- `rounds` – antal rundor (1–5). Varje runda: mät, planera högst `maxChanges` ändringar, bygg + granska + slå ihop var och en i tur och ordning, uppdatera anteckningarna.
- `full: true` kör hela testsviten och alla biomer i mätningen (45–60 min); standard är snabbläget (ca 6 min).
- `focus` – valfri riktning från användaren, t.ex. "balans i de nya biomerna" eller "prestanda på telefon".

Loopens minne är `tools/playtest/LOOP_NOTES.md` (backlogg, historik, lärdomar). Planeraren läser den, steget Lär skriver den. Läs den innan du föreslår något manuellt.

## Regler som gör loopen säker
1. **En skrivare åt gången.** Ändringar byggs en i taget i samma arbetsträd; granskaren är skrivskyddad.
2. **Bara grönt checkas in.** En ändring checkas in först när byggarens tester, granskarens godkännande och slå-ihop-stegets slutkontroll alla är gröna. Annars sparas diffen i `tools/playtest/out/rejected/` och bara de filer ändringen rörde återställs.
3. **Testa beteende, inte konstanter.** Varje ändring har ett eget riktat test (`tools/playtest/tNN.mjs`).
4. **Mät före och efter.** `node tools/playtest/measure.mjs [--quick]` skriver `tools/playtest/out/report.md`: gen-test, cards-test, speltester och bottar utan gudläge per biom (dödsfall och skada per våning, dödsorsaker, fastlåsningar, sidfel, sämsta bildruta).
5. **Aldrig** `git stash`, `git checkout` eller `git reset`; inga betal-API:er.

## Manuella verktyg
- Hela speltestsviten: `bash tools/playtest/runall.sh` (mot en fryst kopia: `KRYPTA_ROOT=<dir>`; `git archive HEAD | tar -x -C <dir>`).
- En bot: `cd tools/playtest && node botng.mjs 3 "&biome=circus"` (utan gudläge) eller `node bot.mjs 3 "&biome=circus"` (gudläge).
- Artefakten: `python3 tools/artifact/build.py` bygger `tools/artifact/out/` med stabila paket och skriver vilka paket som ändrats; prova med `node tools/artifact/tart2.mjs` och `node tools/artifact/tartm.mjs` (telefon) före publicering, och kör `python3 tools/artifact/build.py --mark-published` efter.
