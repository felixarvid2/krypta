export const meta = {
  name: 'forbattra',
  description: 'Självförbättrande loop för Krypta: mät, planera, bygg och testa, granska, slå ihop och lär – en eller flera rundor',
  whenToUse: 'När spelet ska förbättras stegvis med mätning, oberoende granskning och bara gröna incheckningar. args: { rounds?: number (1), maxChanges?: number (2), full?: boolean (false = snabbmätning), focus?: string }',
  phases: [
    { title: 'Mät', detail: 'tools/playtest/measure.mjs → out/report.md' },
    { title: 'Planera', detail: 'välj små, testbara förbättringar ur rapporten och LOOP_NOTES.md' },
    { title: 'Bygg', detail: 'en ändring i taget, med eget test' },
    { title: 'Granska', detail: 'oberoende granskare läser bara diffen' },
    { title: 'Slå ihop', detail: 'slutkontroll; checka in och pusha, eller spara patch och återställ' },
    { title: 'Lär', detail: 'uppdatera LOOP_NOTES.md' },
  ],
}

const A = args || {}
const ROUNDS = Math.max(1, Math.min(5, A.rounds || 1))
const MAX = Math.max(1, Math.min(3, A.maxChanges || 2))
const FULL = !!A.full
const FOCUS = A.focus || ''

const RULES = `Regler för Krypta-repot (/home/user/krypta, gren claude/version-8):
- Spelet är en raycaster-FPS i ren JS: js/game.js (spelet), js/gen.js (bangeneratorn), js/cards.js, js/weapons.js, js/music.js. Testrigg i tools/playtest (Playwright: node tools/playtest/tNN.mjs, bottar bot.mjs/botng.mjs, runall.sh, measure.mjs) och tools/gen-test.js, tools/cards-test.js.
- ALDRIG git stash, git checkout, git reset eller annat som kastar bort ändringar du inte själv gjort. Inga betal-API:er.
- Gör minsta möjliga ändring som löser uppgiften. Ändra inte fröstabiliteten i js/gen.js utan att gen-test fortfarande säger ALLA TESTER OK.
- Allt användarsynligt (texter i spelet, commit-meddelanden, rapporter) skrivs på svenska.`

const PLAN = { type: 'object', properties: {
  done: { type: 'boolean', description: 'true om inget värt att göra finns kvar' },
  changes: { type: 'array', items: { type: 'object', properties: {
    title: { type: 'string' }, why: { type: 'string', description: 'mätvärde eller observation som motiverar ändringen' },
    files: { type: 'array', items: { type: 'string' } }, plan: { type: 'string' },
    acceptance: { type: 'string', description: 'konkret test som ska bli grönt (befintligt tNN.mjs eller nytt) och vilka mått som ska bli bättre' } },
    required: ['title', 'why', 'files', 'plan', 'acceptance'] } } }, required: ['done', 'changes'] }
const BUILD = { type: 'object', properties: { changed: { type: 'array', items: { type: 'string' } }, tests: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, ok: { type: 'boolean' }, note: { type: 'string' } }, required: ['name', 'ok'] } }, summary: { type: 'string' }, gaveUp: { type: 'boolean' } }, required: ['changed', 'tests', 'summary', 'gaveUp'] }
const REVIEW = { type: 'object', properties: { approve: { type: 'boolean' }, problems: { type: 'array', items: { type: 'string' } }, summary: { type: 'string' } }, required: ['approve', 'problems', 'summary'] }
const MERGE = { type: 'object', properties: { committed: { type: 'boolean' }, commit: { type: 'string' }, pushed: { type: 'boolean' }, reverted: { type: 'boolean' }, patch: { type: 'string' }, note: { type: 'string' } }, required: ['committed', 'reverted', 'note'] }

const history = []
for (let round = 1; round <= ROUNDS; round++) {
  phase('Mät')
  const report = await agent(`${RULES}

Kör mätningen och returnera rapporten. Kör: cd /home/user/krypta && node tools/playtest/measure.mjs ${FULL ? '' : '--quick'}
(snabbläget tar ca 6 min, fullt läge ca 45–60 min; kör det i förgrunden med lång timeout). Kontrollera först med git status att arbetsträdet är rent; är det inte rent, returnera bara texten "SMUTSIGT ARBETSTRÄD" och listan.
Returnera innehållet i tools/playtest/out/report.md ordagrant, plus de sista 20 raderna av git log --oneline.`, { label: `mät runda ${round}`, phase: 'Mät' })
  if (!report || /SMUTSIGT ARBETSTRÄD/.test(report)) { log('Avbryter: mätningen misslyckades eller arbetsträdet är inte rent.'); history.push({ round, stopped: 'mätning' }); break }

  phase('Planera')
  const plan = await agent(`${RULES}

Du är planeraren i en självförbättrande loop. Läs mätrapporten nedan, tools/playtest/LOOP_NOTES.md (backlogg, historik, lärdomar) och vid behov koden.
Välj högst ${MAX} förbättringar som (1) är små och självständiga, (2) går att verifiera med ett konkret test, (3) rör olika filer eller olika delar av js/game.js så att de kan byggas en i taget utan att störa varandra, och (4) inte redan provats och underkänts enligt historiken. Prioritera: sidfel och fastlåsningar > fel i speltester > tydliga balansavvikelser (dödsfall/våning långt över kryptan 0,25 och vulkanen 0,5) > punkter i backloggen > polering.${FOCUS ? `\nAnvändarens fokus för den här körningen: ${FOCUS}` : ''}
Ändra inga filer. Sätt done=true och tom lista om inget är värt att göra.

MÄTRAPPORT:
${report}`, { label: `planera runda ${round}`, phase: 'Planera', schema: PLAN })
  if (!plan || plan.done || !plan.changes.length) { log('Planeraren hittade inget värt att göra.'); history.push({ round, stopped: 'inget att göra' }); break }
  log(`Runda ${round}: ${plan.changes.map(c => c.title).join(' · ')}`)

  for (const [i, ch] of plan.changes.slice(0, MAX).entries()) {
    const tag = `r${round}.${i + 1}`
    const built = await agent(`${RULES}

Du är byggaren. Genomför EN förbättring i arbetsträdet och testa den. Checka INTE in.
Förbättring: ${ch.title}
Varför: ${ch.why}
Filer: ${ch.files.join(', ')}
Plan: ${ch.plan}
Acceptans: ${ch.acceptance}
Gör så här: läs koden, gör minsta ändringen, kör node -e "new Function(require('fs').readFileSync('js/game.js','utf8'))" (och motsvarande för ändrade js-filer), skriv ett nytt riktat Playwright-test tools/playtest/tNN.mjs (nästa lediga nummer, mall: t94.mjs/t95.mjs/t96.mjs) om inget befintligt täcker acceptansen, kör det och de närmast berörda befintliga testerna (t.ex. det test som täcker den biom/mekanik du rör), och node tools/cards-test.js om js/cards.js ändrats, node tools/gen-test.js om js/gen.js ändrats. Är ändringen inte möjlig eller testerna går inte att få gröna inom rimlig tid: sätt gaveUp=true och beskriv varför (lämna ändå arbetsträdet som det är – slå-ihop-steget återställer).`, { label: `bygg ${tag}: ${ch.title}`, phase: 'Bygg', schema: BUILD })

    const review = built && !built.gaveUp ? await agent(`${RULES}

Du är en oberoende granskare. Du får INTE ändra några filer. Läs ändringen med: cd /home/user/krypta && git diff && git status --short
Avsikten var: ${ch.title} – ${ch.plan}. Acceptans: ${ch.acceptance}.
Bedöm: löser diffen avsikten? Finns buggar (null/undefined, fel enheter, glömda hook-kedjor, prestanda i heta loopar, saker som bara fungerar i testet)? Ändrar den något utanför uppdraget? Är testet meningsfullt (testar beteende, inte en konstant)? Kör gärna de nämnda testerna själv. Godkänn bara om du skulle checka in det själv.`, { label: `granska ${tag}`, phase: 'Granska', schema: REVIEW }) : null

    const ok = !!(built && !built.gaveUp && built.tests.every(t => t.ok) && review && review.approve)
    const merged = await agent(`${RULES}

Du är slå-ihop-steget för ändringen "${ch.title}" (${tag}).
${ok ? `Byggaren och granskaren har godkänt. Gör slutkontrollen: syntaxkontroll av ändrade js-filer, kör testerna ${built.tests.map(t => t.name).join(', ')} en gång till, och node tools/cards-test.js. Är allt grönt: git add bara de ändrade/nya filerna (inte tools/playtest/out eller shots), checka in med ett svenskt meddelande (rubrik + kort förklaring av varför, med mätvärdet) som avslutas med raderna
Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01MJjn4zRGf5KuzNecPuFoZ6
och pusha: git push -u origin claude/version-8 (försök igen upp till 4 gånger vid nätfel). Är något rött: behandla det som underkänt enligt nedan.` : `Ändringen är UNDERKÄND (${built ? (built.gaveUp ? 'byggaren gav upp: ' + built.summary : 'test rött: ' + JSON.stringify(built.tests.filter(t => !t.ok))) : 'byggaren dog'}${review && !review.approve ? '; granskaren: ' + review.problems.join(' | ') : ''}).`}
Vid underkänt: spara diffen som patch (mkdir -p tools/playtest/out/rejected && git diff > tools/playtest/out/rejected/${tag}.patch; ta även med nya ospårade filer: git ls-files --others --exclude-standard), återställ sedan BARA de filer ändringen rörde: git restore -- <ändrade spårade filer> och rm <nya filer som byggaren skapade> (se git status). Rör inget annat. Kontrollera att git status är rent efteråt.`, { label: `slå ihop ${tag}`, phase: 'Slå ihop', schema: MERGE })
    history.push({ round, change: ch.title, why: ch.why, built: built && built.summary, tests: built && built.tests, review: review && { approve: review.approve, problems: review.problems }, merged })
    log(`${tag} ${ch.title}: ${merged && merged.committed ? 'incheckad ' + (merged.commit || '') : 'underkänd – ' + (merged ? merged.note : 'okänt')}`)
  }

  phase('Lär')
  await agent(`${RULES}

Uppdatera tools/playtest/LOOP_NOTES.md efter runda ${round} av förbättringsloopen. Resultat (JSON): ${JSON.stringify(history.filter(h => h.round === round))}
- Historik: en rad per ändring (vad, varför/mätvärde, utfall: incheckad <hash> eller underkänd + skäl).
- Backlogg: ta bort det som blev gjort; lägg till nya problem som byggare/granskare upptäckt.
- Lärdomar: lägg bara till något om det är en ny, generell lärdom (t.ex. ett mönster som ledde till underkännande).
Håll filen kort. Checka in den (git add tools/playtest/LOOP_NOTES.md) med meddelandet "Förbättringsloopen: anteckningar efter runda ${round}" och samma två avslutande rader som övriga incheckningar (Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com> och Claude-Session: https://claude.ai/code/session_01MJjn4zRGf5KuzNecPuFoZ6), och pusha till claude/version-8.`, { label: `lär runda ${round}`, phase: 'Lär' })
}
return history
