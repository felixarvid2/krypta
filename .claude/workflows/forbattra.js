export const meta = {
  name: 'forbattra',
  description: 'Självförbättrande graf-loop för Krypta: mät → planera → (bygg ∥ testa blint) → sammanför och revidera → granska → checka in/återställ → lär',
  whenToUse: 'När spelet ska förbättras stegvis med mätning, blint skrivna acceptanstester, oberoende granskning och bara gröna incheckningar. args: { runId: string (krävs, unikt per körning, t.ex. "0123a"), rounds?: 1–5 (1), maxChanges?: 1–3 (2), full?: bool, biomes?: string[] (för mätningen), focus?: string }',
  phases: [
    { title: 'Mät', detail: 'tools/playtest/measure.mjs → out/report.md' },
    { title: 'Planera', detail: 'små, testbara förbättringar med observerbara krav' },
    { title: 'Bygg', detail: 'byggaren ändrar koden' },
    { title: 'Testa', detail: 'testskrivaren skriver acceptanstestet blint, parallellt med byggaren' },
    { title: 'Sammanför', detail: 'kör testet mot koden; revidera vid rött (högst 2 varv)' },
    { title: 'Granska', detail: 'oberoende granskare läser diffen och testet' },
    { title: 'Checka in', detail: 'slutkontroll; checka in och pusha, eller spara patch och återställ' },
    { title: 'Lär', detail: 'uppdatera LOOP_NOTES.md' },
  ],
}

const A = args || {}
const RUN = String(A.runId || 'x')
const ROUNDS = Math.max(1, Math.min(5, A.rounds || 1))
const MAX = Math.max(1, Math.min(3, A.maxChanges || 2))
const FULL = !!A.full
const FOCUS = A.focus || ''
const BIOMES = Array.isArray(A.biomes) && A.biomes.length ? A.biomes : null

const RULES = `Regler för Krypta-repot (/home/user/krypta, gren claude/version-8):
- Spelet är en raycaster-FPS i ren JS: js/game.js (spelet; testkrokar i window.__game nära slutet av filen), js/gen.js (bangeneratorn), js/cards.js, js/weapons.js, js/music.js. Testrigg i tools/playtest (Playwright-tester tNN.mjs och tl_*.mjs med mallen setup() från head.mjs, bottar bot.mjs/botng.mjs, runall.sh, measure.mjs) och tools/gen-test.js, tools/cards-test.js.
- ALDRIG git stash, git checkout, git reset eller annat som kastar bort ändringar du inte själv gjort. Inga betal-API:er. Lämna tools/playtest/out och shots utanför incheckningar.
- Minsta möjliga ändring som löser uppgiften. js/gen.js: gen-test ska fortfarande säga ALLA TESTER OK (fröstabilitet).
- Allt användarsynligt (texter i spelet, commit-meddelanden, anteckningar) på svenska.`
const TRAILER = `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01MJjn4zRGf5KuzNecPuFoZ6`

const PLAN = { type: 'object', properties: {
  done: { type: 'boolean' },
  changes: { type: 'array', items: { type: 'object', properties: {
    title: { type: 'string' }, why: { type: 'string', description: 'mätvärde/observation som motiverar' },
    files: { type: 'array', items: { type: 'string' }, description: 'källfiler byggaren får ändra (inte testfiler)' },
    plan: { type: 'string', description: 'hur byggaren ska göra' },
    observable: { type: 'string', description: 'kravet uttryckt som observerbart beteende i spelet: uppställning (karta via __game.playCustom eller Gen-anrop), handling och förväntat utfall, med exakta namn på de __game-krokar testet får använda. Behövs en ny krok: namnge den här så att byggaren lägger till den.' } },
    required: ['title', 'why', 'files', 'plan', 'observable'] } } }, required: ['done', 'changes'] }
const BUILD = { type: 'object', properties: { changed: { type: 'array', items: { type: 'string' } }, hooks: { type: 'array', items: { type: 'string' } }, summary: { type: 'string' }, gaveUp: { type: 'boolean' } }, required: ['changed', 'summary', 'gaveUp'] }
const TEST = { type: 'object', properties: { file: { type: 'string' }, checks: { type: 'array', items: { type: 'string' } }, notes: { type: 'string' } }, required: ['file', 'checks'] }
const CHECK = { type: 'object', properties: { green: { type: 'boolean' }, failing: { type: 'array', items: { type: 'string' } }, output: { type: 'string' }, blame: { type: 'string', enum: ['none', 'code', 'test', 'unclear'] } }, required: ['green', 'failing', 'output', 'blame'] }
const REVIEW = { type: 'object', properties: { approve: { type: 'boolean' }, problems: { type: 'array', items: { type: 'string' } }, summary: { type: 'string' } }, required: ['approve', 'problems', 'summary'] }
const MERGE = { type: 'object', properties: { committed: { type: 'boolean' }, commit: { type: 'string' }, pushed: { type: 'boolean' }, reverted: { type: 'boolean' }, note: { type: 'string' } }, required: ['committed', 'reverted', 'note'] }

const history = []
for (let round = 1; round <= ROUNDS; round++) {
  phase('Mät')
  const report = await agent(`${RULES}

Kör mätningen och returnera rapporten. Kontrollera först med git status --short att arbetsträdet är rent (ospårade filer i tools/playtest/out och shots räknas inte); är det inte rent, returnera bara "SMUTSIGT ARBETSTRÄD" och listan.
Kör: cd /home/user/krypta && node tools/playtest/measure.mjs ${FULL ? '' : '--quick'}${round > 1 && !FULL ? ' --skip-gen' : ''}${BIOMES ? ' --biomes ' + BIOMES.join(',') : ''}  (i förgrunden, timeout upp till 60 min).
Returnera tools/playtest/out/report.md ordagrant och de sista 15 raderna av git log --oneline.`, { label: `mät ${RUN}.${round}`, phase: 'Mät' })
  if (!report || /SMUTSIGT ARBETSTRÄD/.test(report)) { log('Avbryter: mätningen misslyckades eller arbetsträdet är inte rent.'); history.push({ round, stopped: 'mätning', report }); break }

  phase('Planera')
  const plan = await agent(`${RULES}

Du är planeraren i en självförbättrande loop. Läs mätrapporten nedan, tools/playtest/LOOP_NOTES.md (backlogg, historik, lärdomar) och koden där det behövs.
Välj högst ${MAX} förbättringar som är (1) små och självständiga, (2) verifierbara genom observerbart beteende i spelet, (3) inte redan provade och underkända enligt historiken. Prioritera: sidfel och fastlåsningar > fel i speltester > tydliga balansavvikelser (dödsfall/våning långt över kryptan och vulkanen) > backloggen > polering.${FOCUS ? `\nAnvändarens fokus: ${FOCUS}` : ''}
Varje förbättring byggs av en byggare medan en ANNAN agent samtidigt skriver acceptanstestet utan att se koden, så fältet "observable" måste vara precist: uppställning, handling, förväntat utfall och vilka __game-krokar (befintliga eller nya, namngivna) testet använder. Ändra inga filer. done=true och tom lista om inget är värt att göra.

MÄTRAPPORT:
${report}`, { label: `planera ${RUN}.${round}`, phase: 'Planera', schema: PLAN })
  if (!plan || plan.done || !plan.changes.length) { log('Planeraren hittade inget värt att göra.'); history.push({ round, stopped: 'inget att göra' }); break }
  log(`Runda ${round}: ${plan.changes.map(c => c.title).join(' · ')}`)

  for (const [i, ch] of plan.changes.slice(0, MAX).entries()) {
    const tag = `${RUN}_${round}_${i + 1}`
    const testFile = `tools/playtest/tl_${tag}.mjs`
    const spec = `Förbättring: ${ch.title}\nVarför: ${ch.why}\nKrav (observerbart): ${ch.observable}`

    // förgrening: bygg och testa parallellt, i olika filer
    const [built, test] = await parallel([
      () => agent(`${RULES}

Du är BYGGAREN. Genomför förbättringen i arbetsträdet. Checka inte in. Rör bara källfilerna ${ch.files.join(', ')} (och window.__game-krokarna i js/game.js om kravet namnger nya). Skriv INGA testfiler – en annan agent skriver acceptanstestet samtidigt, utifrån kravet nedan.
${spec}
Plan: ${ch.plan}
Kontrollera syntaxen (node -e "new Function(require('fs').readFileSync('<fil>','utf8'))") och kör gärna befintliga tester som rör samma mekanik (tools/playtest/tNN.mjs), node tools/cards-test.js om js/cards.js ändrats, node tools/gen-test.js om js/gen.js ändrats. gaveUp=true om det inte går.`, { label: `bygg ${tag}`, phase: 'Bygg', schema: BUILD }),
      () => agent(`${RULES}

Du är TESTSKRIVAREN. Skriv ett Playwright-acceptanstest i ${testFile} utifrån kravet nedan, UTAN att titta på byggarens ändringar (läs inte git diff och inte ändrade filer – en annan agent ändrar koden just nu). Använd mallen i tools/playtest/t94.mjs, t95.mjs eller t96.mjs (setup() från ./head.mjs, slumpad port, ok()/done()). Använd bara de __game-krokar kravet namnger eller som redan finns i HEAD (git show HEAD:js/game.js | grep -n "window.__game"). Testa beteendet, inte konstanter, och gör testet robust mot slump (vänta med tidsgräns i stället för fasta väntetider, nollställ fiendernas fart/skada där det inte är det som testas). Kör INTE testet (koden är inte klar). Returnera filnamnet och kontrollerna.
${spec}`, { label: `testa ${tag}`, phase: 'Testa', schema: TEST }),
    ])

    // sammanför: kör testet mot koden, revidera vid rött
    let check = null, cur = built
    for (let rev = 0; cur && !cur.gaveUp && test && rev <= 2; rev++) {
      check = await agent(`${RULES}

Du är SAMMANFÖRAREN. Kör acceptanstestet ${test.file} mot koden i arbetsträdet (cd /home/user/krypta/tools/playtest && node ${test.file.replace('tools/playtest/', '')}) – kör det två gånger för att upptäcka slump. Kör även syntaxkontroll av ${(cur.changed || []).join(', ') || 'de ändrade filerna'}. Ändra inga filer.
green=true bara om båda körningarna saknar FAIL och sidfel. Vid rött: avgör blame – 'code' om koden inte uppfyller kravet, 'test' om testet är fel eller ostadigt i förhållande till kravet nedan, 'unclear' annars. Lägg relevant utdata i output.
${spec}`, { label: `sammanför ${tag}${rev ? ' v' + (rev + 1) : ''}`, phase: 'Sammanför', schema: CHECK })
      if (!check || check.green || rev === 2) break
      cur = await agent(`${RULES}

Du är BYGGAREN igen (revidering ${rev + 1}). Acceptanstestet ${test.file} är rött (bedömning: ${check.blame}). ${check.blame === 'test' ? `Sammanföraren anser att TESTET är fel: rätta testet så att det prövar kravet korrekt (ändra inte kravet).` : 'Rätta koden så att den uppfyller kravet; ändra inte testet för att få det grönt.'}
${spec}
Misslyckade kontroller: ${check.failing.join(' | ')}
Utdata: ${check.output}`, { label: `revidera ${tag} v${rev + 1}`, phase: 'Sammanför', schema: BUILD })
    }

    const green = !!(cur && !cur.gaveUp && check && check.green)
    const review = green ? await agent(`${RULES}

Du är en oberoende GRANSKARE. Du får INTE ändra några filer. Läs ändringen: cd /home/user/krypta && git diff && git status --short && cat ${test.file}
Avsikt: ${spec}
Bedöm: uppfyller diffen kravet? Buggar (null/undefined, glömda hook-kedjor, prestanda i heta loopar, beteende som bara fungerar i testet)? Ändras något utanför uppdraget? Prövar testet verkligen kravet? Godkänn bara om du själv skulle checka in det.`, { label: `granska ${tag}`, phase: 'Granska', schema: REVIEW }) : null

    const ok = green && review && review.approve
    const merged = await agent(`${RULES}

Du är steget CHECKA IN för "${ch.title}" (${tag}).
${ok ? `Byggare, testskrivare, sammanförare och granskare är överens. Slutkontroll: syntax för ändrade js-filer, kör ${test.file} en gång till och node tools/cards-test.js (och node tools/gen-test.js om js/gen.js ändrats). Allt grönt: git add bara de ändrade källfilerna och ${test.file}, checka in med ett svenskt meddelande (rubrik + varför, med mätvärdet) som avslutas med raderna
${TRAILER}
och pusha: git push -u origin claude/version-8 (upp till 4 försök vid nätfel). Något rött: behandla som underkänt nedan.` : `Ändringen är UNDERKÄND (${!cur ? 'byggaren dog' : cur.gaveUp ? 'byggaren gav upp: ' + cur.summary : !test ? 'testskrivaren dog' : !check ? 'sammanföringen dog' : !check.green ? 'acceptanstestet rött efter revideringar (' + check.blame + '): ' + check.failing.join(' | ') : 'granskaren: ' + (review ? review.problems.join(' | ') : 'dog')}).`}
Vid underkänt: mkdir -p tools/playtest/out/rejected && (git diff; for f in $(git ls-files --others --exclude-standard); do echo "=== ny fil $f"; cat "$f"; done) > tools/playtest/out/rejected/${tag}.patch, återställ sedan BARA det ändringen rörde: git restore -- <ändrade spårade filer> och rm <nya filer> enligt git status. Kontrollera att git status --short är rent (utom out/ och shots/).`, { label: `checka in ${tag}`, phase: 'Checka in', schema: MERGE })
    history.push({ round, tag, change: ch.title, why: ch.why, built: cur && cur.summary, test: test && test.file, check: check && { green: check.green, blame: check.blame, failing: check.failing }, review: review && { approve: review.approve, problems: review.problems }, merged })
    log(`${tag} ${ch.title}: ${merged && merged.committed ? 'incheckad ' + (merged.commit || '') : 'underkänd – ' + (merged ? merged.note : 'okänt')}`)
  }

  phase('Lär')
  await agent(`${RULES}

Uppdatera tools/playtest/LOOP_NOTES.md efter runda ${round} (körning ${RUN}). Resultat (JSON): ${JSON.stringify(history.filter(h => h.round === round))}
- Historik: en rad per ändring (vad, mätvärdet som motiverade, utfall: incheckad <hash> eller underkänd + skäl, och om testet eller koden fick skulden).
- Backlogg: ta bort det som blev gjort; lägg till nya problem som agenterna upptäckt.
- Lärdomar: bara nya, generella lärdomar (t.ex. ett mönster bakom underkännanden, ett sätt att skriva krav som gav bra blinda tester).
Håll filen kort. Checka in den (git add tools/playtest/LOOP_NOTES.md) med meddelandet "Förbättringsloopen: anteckningar efter ${RUN}.${round}" och raderna
${TRAILER}
och pusha till claude/version-8.`, { label: `lär ${RUN}.${round}`, phase: 'Lär' })
}
return history
