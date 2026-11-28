// t76:s klockdel blir oberoende av fröet: med T76_SEED=k470zz (run.seed 1216369871, där en spikfälla tidigare dödade en
// KUGGSPINDEL och gav 'FAIL klockan tickar') och med tre slumpade frön ska t76 avslutas utan FAIL-rader och med
// OK för 'klockan tickar', 'en död ger mer tid', 'när tiden tar slut dör man' och 'inga fel'.
// Testet använder inga __game-krokar direkt; det kör t76.mjs som barnprocess med cwd tools/playtest.
import { setup } from './head.mjs';
import { spawn } from 'child_process'; import path from 'path'; import { fileURLToPath } from 'url';
// porten väljs utanför 8900–8989, som t76.mjs själv slumpar i, så att barnprocessen inte krockar med vår server
const PORT = 9100 + Math.floor(Math.random() * 90);
const { ok, done } = await setup(PORT, 'out/tl_g_1_1');
const HERE = path.dirname(fileURLToPath(import.meta.url));

const run = (env, timeoutS) => new Promise(res => {
  const p = spawn('node', ['t76.mjs'], { cwd: HERE, env }); let o = '', killed = false;
  p.stdout.on('data', d => o += d); p.stderr.on('data', d => o += d);
  const t = setTimeout(() => { killed = true; p.kill('SIGKILL'); }, timeoutS * 1000);
  p.on('close', c => { clearTimeout(t); res({ code: c, killed, out: o }); });
});
const envWith = extra => { const e = { ...process.env }; delete e.T76_SEED; return { ...e, ...extra }; };
// en barnprocess som råkar slumpa en upptagen port körs om (högst två gånger)
const t76 = async env => { let r; for (let i = 0; i < 3; i++) { r = await run(env, 300); if (!/EADDRINUSE/.test(r.out)) break; } return r; };
const tail = (o, n = 6) => o.trim().split('\n').slice(-n).join(' ⏎ ').slice(0, 900);
const WANT = ['klockan tickar', 'en död ger mer tid', 'när tiden tar slut dör man', 'inga fel'];

function check(label, r) {
  const lines = r.out.split('\n');
  ok(!r.killed && r.code === 0, `${label}: t76 avslutas (kod ${r.code}${r.killed ? ', dödad efter tidsgränsen' : ''})${!r.killed && r.code === 0 ? '' : ' (utdata: ' + tail(r.out) + ')'}`);
  const fails = lines.filter(l => l.startsWith('FAIL'));
  ok(fails.length === 0, `${label}: inga FAIL-rader${fails.length ? ' (' + fails.slice(0, 4).join(' / ').slice(0, 600) + ')' : ''}`);
  for (const w of WANT) {
    const hit = lines.some(l => l.startsWith('OK') && l.includes(w));
    ok(hit, `${label}: OK-rad med '${w}'${hit ? '' : ' saknas (utdata: ' + tail(r.out) + ')'}`);
  }
}

// Fall A: fröet som tidigare fällde klockdelen
check('T76_SEED=k470zz', await t76(envWith({ T76_SEED: 'k470zz' })));

// Fall B: tre körningar med slumpade frön (en i taget, så att datorn inte överbelastas och tiderna håller)
for (let i = 1; i <= 3; i++) check(`slumpat frö ${i}`, await t76(envWith({})));

await done();
