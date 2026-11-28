// Bygger js/game.js av delarna i src/game/ (sorterade efter namn, sammanfogade byte för byte i den ordningen).
//   node tools/build-game.mjs           skriver js/game.js
//   node tools/build-game.mjs --check   skriver inget; avslutar med 1 om js/game.js inte är exakt delarnas summa
//   node tools/build-game.mjs --syntax  kontrollerar varje del för sig (inslagen i en funktion, som i spelet) och att inget namn på
//                                       toppnivå finns i två delar (en senare funktion skulle tyst ersätta den förra)
//
// Hela spelet ligger i en enda funktion som anropas direkt: (() => { ... })(); Den första delen öppnar den och den sista stänger den.
// Därför fungerar funktioner och let/const precis som förut, oavsett vilken del de står i, och js/game.js är en vanlig fil för
// spelet, testerna (GAME_JS i head.mjs), artefakten, .deb-paketet och webbzippen.
// Ändra i src/game/, aldrig i js/game.js (den skrivs över). Ordningen spelar roll för kod som körs direkt på toppnivå.
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url'; import { execFileSync } from 'child_process'; import os from 'os';
const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = process.env.KRYPTA_ROOT || path.resolve(HERE, '..');
const DIR = path.join(ROOT, 'src/game'), OUT = path.join(ROOT, 'js/game.js');
const parts = fs.readdirSync(DIR).filter(f => /^\d{4}_.+\.js$/.test(f)).sort();
const join = () => parts.map(f => fs.readFileSync(path.join(DIR, f), 'utf8')).join('');
const mode = process.argv[2] || '';
if (mode === '--check') {
  const want = join(), have = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
  if (want !== have) { console.error('js/game.js stämmer inte med src/game/ – kör: node tools/build-game.mjs'); process.exit(1); }
  console.log(`js/game.js = summan av ${parts.length} delar i src/game/`);
} else if (mode === '--syntax') {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'krypta-del-')); let bad = 0;
  parts.forEach((f, i) => { let s = fs.readFileSync(path.join(DIR, f), 'utf8');
    if (i > 0) s = '(() => {\n' + s; if (i < parts.length - 1) s += '\n})();\n';
    const p = path.join(tmp, f); fs.writeFileSync(p, s);
    try { execFileSync(process.execPath, ['--check', p], { stdio: 'pipe' }); } catch (e) { bad++; console.error('SYNTAXFEL i ' + f + ':\n' + String(e.stderr || e).split('\n').slice(0, 6).join('\n')); } });
  fs.rmSync(tmp, { recursive: true, force: true });
  // samma namn på toppnivå i två delar: en senare function-deklaration ersätter tyst en tidigare (allt ligger i samma funktion)
  const seen = new Map(); for (const f of parts) for (const m of fs.readFileSync(path.join(DIR, f), 'utf8').matchAll(/^(?:async )?(?:function\*? |const |let |var |class )([A-Za-z_$][\w$]*)/gm)) {
    const n = m[1]; if (seen.has(n) && seen.get(n) !== f) { bad++; console.error(`SAMMA NAMN på toppnivå: ${n} i ${seen.get(n)} och ${f}`); } else seen.set(n, f); }
  if (bad) process.exit(1); console.log(`alla ${parts.length} delar är hela satser, inga dubbla namn på toppnivå`);
} else {
  const s = join(); fs.writeFileSync(OUT, s); console.log(`js/game.js byggd av ${parts.length} delar (${s.length} tecken)`);
}
