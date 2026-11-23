// Spelroboten räknar segrar som segrar, inte som dödsfall: botng.mjs med BOTNG_SEGER (anropar __game.endRun(true))
// ger s.wins ≥ 1 utan dödsfall och utan orsaken '?', och measure.mjs visar segrarna i report.json och i en egen kolumn i report.md.
// Testet använder inga __game-krokar direkt; det kör botng.mjs och measure.mjs som barnprocesser.
import { setup } from './head.mjs';
import { spawn } from 'child_process'; import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
// porten väljs utanför 8900–8989, som botng.mjs själv slumpar i, så att barnprocesserna inte krockar med vår server
const PORT = 9100 + Math.floor(Math.random() * 90);
const { ok, done } = await setup(PORT, 'out/tl_e_1_1');
const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, '../..'), OUT = path.join(HERE, 'out');

const run = (args, cwd, env, timeoutS) => new Promise(res => {
  const p = spawn('node', args, { cwd, env }); let o = '';
  p.stdout.on('data', d => o += d); p.stderr.on('data', d => o += d);
  const t = setTimeout(() => p.kill('SIGKILL'), timeoutS * 1000);
  p.on('close', c => { clearTimeout(t); res({ code: c, out: o }); });
});
const envWith = extra => { const e = { ...process.env }; delete e.BOTNG_SEGER; return { ...e, ...extra }; };
const tail = (o, n = 6) => o.trim().split('\n').slice(-n).join(' ⏎ ').slice(0, 900);
const lastJson = out => { const last = out.split('\n').filter(l => /^\d\d:\d\d:\d\d \{/.test(l)).pop(); if (!last) return null; try { return JSON.parse(last.slice(9)); } catch (e) { return null; } };
const sum = o => Object.values(o || {}).reduce((a, x) => a + (+x || 0), 0);
// en barnprocess som råkar slumpa samma port som en annan körs om (högst två gånger)
const botng = async env => { let r; for (let i = 0; i < 3; i++) { r = await run(['botng.mjs', '0.5', '&biome=dungeon'], HERE, env, 190); if (!/EADDRINUSE/.test(r.out)) break; } return r; };

try {
  // ---- Test 1: botten (seger-körning och kontrollkörning parallellt för att hålla tiden nere) ----
  const [rw, rc] = await Promise.all([botng(envWith({ BOTNG_SEGER: '3' })), botng(envWith({}))]);
  const sw = lastJson(rw.out);
  ok(!!sw, `botng med BOTNG_SEGER=3 skriver en JSON-rad ${sw ? '' : '(utdata: ' + tail(rw.out) + ')'}`);
  if (sw) {
    const dead = sum(sw.deaths);
    ok(typeof sw.wins === 'number' && sw.wins >= 1, `BOTNG_SEGER=3: s.wins är ett tal ≥ 1 (wins ${JSON.stringify(sw.wins)}, våningar ${sw.floors}, rundor ${sw.runs})`);
    ok(dead === 0, `BOTNG_SEGER=3: segrar räknas inte som dödsfall (summa deaths ${dead}, deaths ${JSON.stringify(sw.deaths)})`);
    ok(!(sw.causes && Object.prototype.hasOwnProperty.call(sw.causes, '?')), `BOTNG_SEGER=3: dödsorsaken '?' bokförs inte (causes ${JSON.stringify(sw.causes)})`);
  }
  const sidfel = /^SIDFEL:/m.test(rw.out);
  ok(!sidfel, `BOTNG_SEGER=3: inga sidfel i botens utdata${sidfel ? ' (' + rw.out.split('\n').filter(l => /^SIDFEL:/.test(l)).slice(0, 2).join(' / ').slice(0, 400) + ')' : ''}`);

  const sc = lastJson(rc.out);
  ok(!!sc, `botng utan BOTNG_SEGER skriver en JSON-rad ${sc ? '' : '(utdata: ' + tail(rc.out) + ')'}`);
  if (sc) ok(typeof sc.wins === 'number' && sc.wins === 0, `utan BOTNG_SEGER: s.wins är talet 0 (wins ${JSON.stringify(sc.wins)}, våningar ${sc.floors}, dödsfall ${sum(sc.deaths)})`);

  // ---- Test 2: mätningen (report.json/report.md säkerhetskopieras och återställs alltid) ----
  const files = ['report.json', 'report.md'].map(n => path.join(OUT, n));
  const backup = files.map(f => fs.existsSync(f) ? fs.readFileSync(f) : null);
  fs.mkdirSync(path.join(OUT, 'tl_e_1_1'), { recursive: true });
  files.forEach((f, i) => { if (backup[i]) fs.writeFileSync(path.join(OUT, 'tl_e_1_1', path.basename(f) + '.bak'), backup[i]); });
  const restore = () => files.forEach((f, i) => { try { if (backup[i]) fs.writeFileSync(f, backup[i]); else if (fs.existsSync(f)) fs.unlinkSync(f); } catch (e) { /* bästa försök */ } });
  process.on('exit', restore);
  try {
    files.forEach(f => { if (fs.existsSync(f)) fs.unlinkSync(f); }); // så att en gammal rapport aldrig läses
    const rm = await run(['tools/playtest/measure.mjs', '--skip-gen', '--skip-suite', '--biomes', 'dungeon', '--minutes', '0.5'], ROOT, envWith({ BOTNG_SEGER: '3' }), 400);
    let rep = null; try { rep = JSON.parse(fs.readFileSync(files[0], 'utf8')); } catch (e) { rep = null; }
    ok(!!rep, `measure.mjs skriver out/report.json ${rep ? '' : '(utdata: ' + tail(rm.out) + ')'}`);
    const bd = rep && rep.bots && rep.bots.dungeon;
    ok(!!bd, `report.json har bots.dungeon ${bd ? '' : '(' + JSON.stringify(rep && rep.bots).slice(0, 300) + ')'}`);
    if (bd) {
      ok(typeof bd.wins === 'number' && bd.wins >= 1, `report.json: bots.dungeon.wins är ett tal ≥ 1 (wins ${JSON.stringify(bd.wins)}, våningar ${bd.floors})`);
      if (bd.floors > 0) ok(bd.deathsPerFloor === 0, `report.json: segrar höjer inte dödsfall/våning (deathsPerFloor ${JSON.stringify(bd.deathsPerFloor)}, våningar ${bd.floors})`);
      else console.log('obs: bots.dungeon.floors är', bd.floors, '– dödsfall/våning kontrolleras inte');
    }
    const md = fs.existsSync(files[1]) ? fs.readFileSync(files[1], 'utf8') : null;
    ok(md !== null, 'measure.mjs skriver out/report.md');
    if (md !== null) {
      const lines = md.split('\n');
      const HEAD = '| biom | våningar | dödsfall/våning | segrar | skada/våning | fastnade | sidfel | sämsta bildruta ms | vanligaste dödsorsaker |';
      ok(lines.includes(HEAD), `report.md: rubrikraden har kolumnen segrar efter dödsfall/våning (${(lines.find(l => l.startsWith('| biom |')) || 'ingen rubrikrad').slice(0, 200)})`);
      const row = lines.find(l => l.startsWith('| dungeon |'));
      ok(!!row, 'report.md: det finns en rad för dungeon');
      if (row) {
        const cells = row.split('|').slice(1, -1).map(c => c.trim());
        ok(cells.length === 9, `report.md: dungeon-raden har 9 celler (${cells.length}: ${row.slice(0, 200)})`);
        ok(!!bd && cells[3] !== '' && Number(cells[3]) === bd.wins, `report.md: fjärde cellen i dungeon-raden är segrarna (${JSON.stringify(cells[3])}, report.json wins ${bd && JSON.stringify(bd.wins)})`);
      }
    }
  } finally { restore(); }
} catch (e) {
  ok(false, 'testet kraschade: ' + String(e && e.stack || e).split('\n').slice(0, 2).join(' '));
}
await done();
