// measure.mjs ger varje bott en egen ledig port och bokför bottar som inte ger något resultat.
// Fall A: alla portar 8900–8989 är upptagna – bottarna ska ändå starta (egen ledig port via BOT_PORT) och klara minst en våning.
// Fall B: botten kan inte starta (chromium saknas) – report.json ska ha floors 0 och ett error-fält, och report.md ska visa FEL.
// Testet använder inga __game-krokar; det kör measure.mjs som barnprocess med cwd repots rot.
import { setup } from './head.mjs';
import { spawn } from 'child_process'; import fs from 'fs'; import http from 'http'; import path from 'path'; import { fileURLToPath } from 'url';
// testets egen port ligger utanför 8900–8989
const PORT = 9100 + Math.floor(Math.random() * 90);
const T0 = Date.now();
const { ok, done } = await setup(PORT, 'out/tl_h_1_2');
const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, '../..'), OUT = path.join(HERE, 'out');

const run = (args, cwd, env, timeoutS) => new Promise(res => {
  const p = spawn('node', args, { cwd, env }); let o = '';
  p.stdout.on('data', d => o += d); p.stderr.on('data', d => o += d);
  const t = setTimeout(() => p.kill('SIGKILL'), timeoutS * 1000);
  p.on('close', c => { clearTimeout(t); res({ code: c, out: o }); });
});
const envWith = extra => { const e = { ...process.env }; delete e.BOTNG_SEGER; delete e.BOT_PORT; return { ...e, ...extra }; };
const tail = (o, n = 6) => o.trim().split('\n').slice(-n).join(' ⏎ ').slice(0, 900);
const files = ['report.json', 'report.md'].map(n => path.join(OUT, n));
const readRep = () => { try { return JSON.parse(fs.readFileSync(files[0], 'utf8')); } catch (e) { return null; } };
const readMd = () => fs.existsSync(files[1]) ? fs.readFileSync(files[1], 'utf8') : null;
const clearRep = () => files.forEach(f => { try { if (fs.existsSync(f)) fs.unlinkSync(f); } catch (e) { /* bästa försök */ } });

// säkerhetskopiera report.json/report.md och återställ dem alltid
fs.mkdirSync(path.join(OUT, 'tl_h_1_2'), { recursive: true });
const backup = files.map(f => fs.existsSync(f) ? fs.readFileSync(f) : null);
files.forEach((f, i) => { if (backup[i]) fs.writeFileSync(path.join(OUT, 'tl_h_1_2', path.basename(f) + '.bak'), backup[i]); });
const restore = () => files.forEach((f, i) => { try { if (backup[i]) fs.writeFileSync(f, backup[i]); else if (fs.existsSync(f)) fs.unlinkSync(f); } catch (e) { /* bästa försök */ } });
process.on('exit', restore);
// runall.sh avbryter med SIGTERM efter 200 s; då körs inte exit-hanteraren av sig själv
for (const sig of ['SIGTERM', 'SIGINT']) process.on(sig, () => { restore(); process.exit(143); });
// alla tidsgränser räknas från en gemensam deadline så att hela testet håller sig under 200 s
const left = () => (T0 + 185000 - Date.now()) / 1000;

// ockupera en port som head.mjs gör (listen utan host); en redan upptagen port hoppas över
const occupy = port => new Promise(res => {
  const s = http.createServer((q, r) => { r.statusCode = 404; r.end(); });
  s.once('error', () => res(null));
  s.once('listening', () => res(s));
  s.listen(port);
});
let servers = [];
const closeServers = async () => { const ss = servers; servers = []; await Promise.all(ss.map(s => new Promise(r => { try { s.closeAllConnections?.(); } catch (e) { /* bästa försök */ } s.close(() => r()); }))); };
process.on('exit', () => { for (const s of servers) { try { s.close(); } catch (e) { /* bästa försök */ } } });

try {
  // ---- Fall A: alla portar 8900–8989 upptagna ----
  try {
    for (let p = 8900; p <= 8989; p++) { const s = await occupy(p); if (s) servers.push(s); }
    console.log(`fall A: ${servers.length} av 90 portar i 8900–8989 ockuperade av testet (övriga var redan upptagna)`);
    clearRep(); // så att en gammal rapport aldrig läses
    const ra = await run(['tools/playtest/measure.mjs', '--skip-gen', '--skip-suite', '--biomes', 'ship,dungeon', '--minutes', '0.5', '--parallel', '2'], ROOT, envWith({}), Math.min(125, Math.max(20, left() - 30)));
    const rep = readRep();
    ok(!!rep, `fall A: measure.mjs skriver out/report.json ${rep ? '' : '(utdata: ' + tail(ra.out) + ')'}`);
    for (const b of ['ship', 'dungeon']) {
      const s = rep && rep.bots && rep.bots[b];
      ok(!!s, `fall A: report.json har bots.${b} ${s ? '' : '(' + JSON.stringify(rep && rep.bots).slice(0, 300) + ')'}`);
      if (!s) continue;
      ok(typeof s.floors === 'number' && s.floors >= 1, `fall A: ${b}-botten klarar minst en våning trots att 8900–8989 är upptagna (floors ${JSON.stringify(s.floors)}, error ${JSON.stringify(s.error)}${/EADDRINUSE/.test(ra.out) ? ', EADDRINUSE i utdata' : ''})`);
      ok(!s.error, `fall A: bots.${b} har inget sant error-fält (error ${JSON.stringify(s.error)})`);
    }
  } finally { await closeServers(); }

  // ---- Fall B: botten kan inte starta ----
  clearRep();
  const rb = await run(['tools/playtest/measure.mjs', '--skip-gen', '--skip-suite', '--biomes', 'dungeon', '--minutes', '0.5'], ROOT, envWith({ PW_CHROMIUM: '/finns/inte/chromium' }), Math.max(20, left()));
  const repB = readRep();
  ok(!!repB, `fall B: measure.mjs skriver out/report.json ${repB ? '' : '(utdata: ' + tail(rb.out) + ')'}`);
  const d = repB && repB.bots && repB.bots.dungeon;
  ok(!!d, `fall B: report.json har bots.dungeon ${d ? '' : '(' + JSON.stringify(repB && repB.bots).slice(0, 300) + ')'}`);
  if (d) {
    ok(d.floors === 0, `fall B: bots.dungeon.floors är 0 (${JSON.stringify(d.floors)})`);
    ok(typeof d.error === 'string' && d.error.trim() !== '', `fall B: bots.dungeon.error är en sträng som inte är tom (${typeof d.error === 'string' ? d.error.length + ' tecken' : typeof d.error})`);
  }
  const md = readMd();
  ok(md !== null, `fall B: measure.mjs skriver out/report.md ${md !== null ? '' : '(utdata: ' + tail(rb.out) + ')'}`);
  if (md !== null) {
    const row = md.split('\n').find(l => l.startsWith('| dungeon |'));
    ok(!!row, 'fall B: report.md har en rad som börjar med "| dungeon |"');
    if (row) ok(row.includes('FEL'), `fall B: dungeon-raden i report.md innehåller FEL (${row.slice(0, 250)})`);
  }
} catch (e) {
  ok(false, 'testet kraschade: ' + String(e && e.stack || e).split('\n').slice(0, 2).join(' '));
} finally {
  restore(); await closeServers();
}
const secs = (Date.now() - T0) / 1000;
ok(secs < 200, `hela testet tar under 200 s (${secs.toFixed(0)} s)`);
await done();
