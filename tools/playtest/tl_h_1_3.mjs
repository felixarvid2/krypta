// t77:s runprov ska inte störas av den flygande boken Ų: runan prövas mot bläckslemmet ų utan att boken kommer emellan.
// Med T77_BOK=1 (sömmen som ställer boken på skottlinjen, där runan tidigare träffade boken i stället för ų och gav
// 'FAIL runan träffar') och utan T77_BOK ska t77 avslutas utan FAIL-rader och med OK för 'runan träffar'
// (och i fall B även 'ångan skadar' och 'inga fel').
// Testet använder inga __game-krokar direkt; det kör t77.mjs som barnprocess med cwd tools/playtest.
import { setup } from './head.mjs';
import { spawn } from 'child_process'; import path from 'path'; import { fileURLToPath } from 'url';
// runall.sh dödar testet efter 200 s; håll allt, även vår egen uppstart, inom en gemensam tidsbudget
const T0 = Date.now(), BUDGET_S = 180;
// porten väljs utanför 8900–8989, som t77.mjs själv slumpar i, så att barnprocessen inte krockar med vår server
const PORT = 9300 + Math.floor(Math.random() * 90);
const { ok, done } = await setup(PORT, 'out/tl_h_1_3');
const HERE = path.dirname(fileURLToPath(import.meta.url));
const left = () => BUDGET_S - (Date.now() - T0) / 1000;

const run = (env, timeoutS) => new Promise(res => {
  const p = spawn('node', ['t77.mjs'], { cwd: HERE, env }); let o = '', killed = false;
  p.stdout.on('data', d => o += d); p.stderr.on('data', d => o += d);
  const t = setTimeout(() => { killed = true; p.kill('SIGKILL'); }, Math.max(1, timeoutS) * 1000);
  p.on('close', c => { clearTimeout(t); res({ code: c, killed, out: o }); });
});
const envWith = extra => { const e = { ...process.env }; delete e.T77_BOK; return { ...e, ...extra }; };
// en barnprocess som råkar slumpa en upptagen port körs om (högst två gånger)
const t77 = async (env, maxS) => {
  let r;
  for (let i = 0; i < 3; i++) { r = await run(env, Math.min(maxS(), left())); if (!/EADDRINUSE/.test(r.out)) break; }
  return r;
};
const tail = (o, n = 6) => o.trim().split('\n').slice(-n).join(' ⏎ ').slice(0, 900);

function check(label, r, want) {
  const lines = r.out.split('\n');
  ok(!r.killed, `${label}: t77 hinner klart${r.killed ? ' (dödad efter tidsgränsen, utdata: ' + tail(r.out) + ')' : ''}`);
  const fails = lines.filter(l => l.startsWith('FAIL'));
  ok(fails.length === 0, `${label}: inga FAIL-rader${fails.length ? ' (' + fails.slice(0, 5).join(' / ').slice(0, 700) + ')' : ''}`);
  for (const w of want) {
    const hit = lines.some(l => l.startsWith('OK') && l.includes(w));
    ok(hit, `${label}: OK-rad med '${w}'${hit ? '' : ' saknas (utdata: ' + tail(r.out) + ')'}`);
  }
}

// Fall A: den flygande boken ställs på skottlinjen mellan spelaren och bläckslemmet (fall A får högst halva budgeten)
const deadlineA = T0 + (BUDGET_S / 2) * 1000;
check('T77_BOK=1', await t77(envWith({ T77_BOK: '1' }), () => (deadlineA - Date.now()) / 1000), ['runan träffar']);

// Fall B: en vanlig körning utan sömmen
check('utan T77_BOK', await t77(envWith({}), () => left()), ['runan träffar', 'ångan skadar', 'inga fel']);

await done();
