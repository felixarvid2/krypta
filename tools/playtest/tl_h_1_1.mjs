// t76 väljer en öppen plats utan tomrum eller djupt vatten och tar ett frö för första delen (T76_SEED1).
// Med T76_SEED1=p8 (run.seed 908, där open() tidigare valde en plats intill tomrumsrutor så att fienderna föll)
// och med ett slumpat frö ska t76 avslutas utan FAIL-rader och med OK för den öppna platsen, avrättningen,
// pareringen, fiendefejden och 'inga fel'.
// Testet använder inga __game-krokar direkt; det kör t76.mjs som barnprocess med cwd tools/playtest.
import { setup } from './head.mjs';
import { spawn } from 'child_process'; import path from 'path'; import { fileURLToPath } from 'url';
// runall.sh dödar testet efter 200 s; håll allt, även vår egen uppstart, inom en gemensam tidsbudget
const T0 = Date.now(), BUDGET_S = 180;
// porten väljs utanför 8900–8989, som t76.mjs själv slumpar i, så att barnprocessen inte krockar med vår server
const PORT = 9200 + Math.floor(Math.random() * 90);
const { ok, done } = await setup(PORT, 'out/tl_h_1_1');
const HERE = path.dirname(fileURLToPath(import.meta.url));
const left = () => BUDGET_S - (Date.now() - T0) / 1000;

const run = (env, timeoutS) => new Promise(res => {
  const p = spawn('node', ['t76.mjs'], { cwd: HERE, env }); let o = '', killed = false;
  p.stdout.on('data', d => o += d); p.stderr.on('data', d => o += d);
  const t = setTimeout(() => { killed = true; p.kill('SIGKILL'); }, Math.max(1, timeoutS) * 1000);
  p.on('close', c => { clearTimeout(t); res({ code: c, killed, out: o }); });
});
const envWith = extra => { const e = { ...process.env }; delete e.T76_SEED; delete e.T76_SEED1; return { ...e, ...extra }; };
// en barnprocess som råkar slumpa en upptagen port körs om (högst två gånger); fall A får högst halva budgeten
const t76 = async (env, maxS) => {
  let r;
  for (let i = 0; i < 3; i++) { r = await run(env, Math.min(maxS(), left())); if (!/EADDRINUSE/.test(r.out)) break; }
  return r;
};
const tail = (o, n = 6) => o.trim().split('\n').slice(-n).join(' ⏎ ').slice(0, 900);

function check(label, r, want) {
  const lines = r.out.split('\n');
  ok(!r.killed, `${label}: t76 hinner klart${r.killed ? ' (dödad efter tidsgränsen, utdata: ' + tail(r.out) + ')' : ''}`);
  const fails = lines.filter(l => l.startsWith('FAIL'));
  ok(fails.length === 0, `${label}: inga FAIL-rader${fails.length ? ' (' + fails.slice(0, 5).join(' / ').slice(0, 700) + ')' : ''}`);
  for (const w of want) {
    const hit = lines.some(l => l.startsWith('OK') && l.includes(w));
    ok(hit, `${label}: OK-rad med '${w}'${hit ? '' : ' saknas (utdata: ' + tail(r.out) + ')'}`);
  }
}

// Fall A: fröet där open() tidigare valde en plats intill tomrum
const deadlineA = T0 + (BUDGET_S / 2) * 1000;
check('T76_SEED1=p8', await t76(envWith({ T76_SEED1: 'p8' }), () => (deadlineA - Date.now()) / 1000),
  ['en öppen plats hittades', 'avrättningen ger hälsa', 'avrättningen räknas', 'det parerade skottet träffar skytten',
    'en fiendes skott skadar en annan sort, som ger igen', 'inga fel']);

// Fall B: en körning med slumpat frö (varken T76_SEED eller T76_SEED1)
check('slumpat frö', await t76(envWith({}), () => left()),
  ['en fiendes skott skadar en annan sort, som ger igen', 'inga fel']);

await done();
