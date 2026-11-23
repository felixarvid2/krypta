// Mätning för förbättringsloopen: kör kontrollerna och skriver out/report.json och out/report.md.
//   node tools/playtest/measure.mjs [--quick] [--biomes a,b,c] [--minutes 3] [--skip-suite] [--skip-gen]
// --quick: bara gen-test, cards-test och bottar i 4 biomer à 2 min (ca 6 min). Utan: hela sviten och alla biomer (ca 45–60 min).
import { spawn } from 'child_process'; import fs from 'fs'; import net from 'net'; import path from 'path'; import { fileURLToPath } from 'url';
const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, '../..'), OUT = path.join(HERE, 'out');
fs.mkdirSync(OUT, { recursive: true });
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; }, has = k => process.argv.includes(k);
const QUICK = has('--quick');
const ALL = ['dungeon', 'caves', 'volcano', 'library', 'foundry', 'cathedral', 'hive', 'garden', 'dream', 'ship', 'lab', 'circus', 'jungle', 'mine', 'observatory', 'sewer', 'desert'];
const BIOMES = (arg('--biomes', '') || (QUICK ? 'dungeon,circus,mine,desert' : ALL.join(','))).split(',').filter(Boolean);
const MIN = +arg('--minutes', QUICK ? 2 : 3), PAR = +arg('--parallel', 4);
const run = (cmd, args, opt = {}) => new Promise(res => { const p = spawn(cmd, args, { cwd: opt.cwd || ROOT, env: { ...process.env, ...(opt.env || {}) } }); let o = '';
  p.stdout.on('data', d => o += d); p.stderr.on('data', d => o += d); const t = setTimeout(() => p.kill('SIGKILL'), (opt.timeout || 1800) * 1000); p.on('close', c => { clearTimeout(t); res({ code: c, out: o }); }); });
const rep = { started: new Date().toISOString(), commit: (await run('git', ['rev-parse', '--short', 'HEAD'])).out.trim(), quick: QUICK };
if (!has('--skip-gen')) { const g = await run('node', ['tools/gen-test.js'], { timeout: 1500 }); rep.genTest = { ok: /ALLA TESTER OK/.test(g.out), tail: g.out.trim().split('\n').slice(-3) }; }
const c = await run('node', ['tools/cards-test.js'], { timeout: 600 }); rep.cardsTest = { ok: /alla kontroller godkända/.test(c.out), tail: c.out.trim().split('\n').slice(-2) };
if (!QUICK && !has('--skip-suite')) { const s = await run('bash', ['runall.sh'], { cwd: HERE, timeout: 5400 }); const lines = s.out.split('\n');
  rep.suite = { total: lines.filter(l => / fail=\d+/.test(l)).length, failed: lines.filter(l => / fail=[1-9]/.test(l)).map(l => l.split(' ')[0]), failLines: lines.filter(l => /^FAIL|SIDFEL|Error/.test(l)).slice(0, 40) }; }
// bottar utan gudläge: skada, dödsfall, dödsorsaker, fastlåsningar, sidfel, sämsta bildruta
rep.bots = {};
const usedPorts = new Set(); // ledig port som measure själv har prövat; bottar i samma körning får olika portar
const freePort = () => new Promise((res, rej) => { const sv = net.createServer(); sv.on('error', rej); sv.listen(0, () => { const p = sv.address().port; sv.close(() => usedPorts.has(p) ? freePort().then(res, rej) : (usedPorts.add(p), res(p))); }); });
for (let i = 0; i < BIOMES.length; i += PAR) {
  await Promise.all(BIOMES.slice(i, i + PAR).map(async b => { let r, last;
    for (let f = 0; f < 2 && !last; f++) { // saknas JSON-rad dog botten vid starten: en ny chans med ny port
      r = await run('node', ['botng.mjs', String(MIN), `&biome=${b}`], { cwd: HERE, timeout: MIN * 60 + 120, env: { BOT_PORT: String(await freePort()) } });
      last = r.out.split('\n').filter(l => /^\d\d:\d\d:\d\d \{/.test(l)).pop(); }
    let s = {}; try { s = JSON.parse(last.slice(9)); } catch (e) { s = { parseError: true }; }
    const fl = s.floors || 0, dmg = Object.values(s.dmg || {}).reduce((a, x) => a + x, 0), dead = Object.values(s.deaths || {}).reduce((a, x) => a + x, 0);
    rep.bots[b] = { floors: fl, deathsPerFloor: fl ? +(dead / fl).toFixed(2) : null, wins: s.wins || 0, dmgPerFloor: fl ? Math.round(dmg / fl) : null, causes: s.causes || {}, stuck: s.stuck || [], pageErrors: (r.out.match(/SIDFEL/g) || []).length, botErr: (s.botErr || []).slice(0, 3), worstFrameMs: s.worst, slowPct: s.slowPct };
    if (!last) rep.bots[b].error = (r.out.trim().split('\n').slice(-8).join('\n').slice(-400) || `botten avslutades utan utdata (kod ${r.code})`);
    process.stdout.write(`bot ${b}: ${JSON.stringify(rep.bots[b])}\n`); }));
}
rep.finished = new Date().toISOString();
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(rep, null, 1));
const md = [`# Mätrapport ${rep.commit} (${rep.finished})`, '', `- gen-test: ${rep.genTest ? (rep.genTest.ok ? 'OK' : 'FEL') : 'hoppades över'}`, `- cards-test: ${rep.cardsTest.ok ? 'OK' : 'FEL'}`,
  rep.suite ? `- speltester: ${rep.suite.total - rep.suite.failed.length}/${rep.suite.total} gröna${rep.suite.failed.length ? ' – föll: ' + rep.suite.failed.join(', ') : ''}` : '- speltester: hoppades över', '',
  '| biom | våningar | dödsfall/våning | segrar | skada/våning | fastnade | sidfel | sämsta bildruta ms | vanligaste dödsorsaker |', '|---|---|---|---|---|---|---|---|---|',
  ...Object.entries(rep.bots).map(([b, s]) => `| ${b} | ${s.floors} | ${s.deathsPerFloor} | ${s.wins} | ${s.dmgPerFloor} | ${s.stuck.length} | ${s.pageErrors} | ${s.worstFrameMs} | ${s.error ? 'FEL: ' + s.error.replace(/\s+/g, ' ').replace(/\|/g, '/').slice(0, 80) : Object.entries(s.causes).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, v]) => k + ' ×' + v).join(', ')} |`)];
if (rep.suite && rep.suite.failLines.length) md.push('', '## Fel i speltesterna', '', ...rep.suite.failLines.map(l => '- ' + l));
fs.writeFileSync(path.join(OUT, 'report.md'), md.join('\n') + '\n');
console.log(md.join('\n'));
