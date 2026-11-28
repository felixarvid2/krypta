// Bygger js/i18n_en.js (window.I18N_EN = { svensk bit: engelsk översättning }) av tools/i18n/en/part_*.json, en/v*.json (en fil per version och agent) och manual.json (manual vinner).
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, '../..'), EN = path.join(HERE, 'en');
const D = {}; let n = 0;
const files = fs.readdirSync(EN).filter(f => /^part_\d+(_a\d+)?\.json$/.test(f)).sort();
const extra = fs.readdirSync(EN).filter(f => /^v\d+.*\.json$/.test(f)).sort(); // egna filer per version och agent (t.ex. v28_level.json): inga krockar i manual.json
for (const f of [...files, ...extra, 'manual.json']) { const p = path.join(EN, f); if (!fs.existsSync(p)) continue; const o = JSON.parse(fs.readFileSync(p, 'utf8')); for (const k in o) if (typeof o[k] === 'string') { D[k] = o[k]; n++; } }
const keep = {}; for (const k of Object.keys(D).sort()) if (D[k] !== k) keep[k] = D[k];
fs.writeFileSync(path.join(ROOT, 'js/i18n_en.js'), '// Genererad av tools/i18n/build.mjs – ändra inte för hand (rätta i tools/i18n/en/manual.json)\nwindow.I18N_EN = ' + JSON.stringify(keep) + ';\n');
const pieces = JSON.parse(fs.readFileSync(path.join(HERE, 'pieces.json'), 'utf8'));
console.log('filer', files.length, '· poster', Object.keys(keep).length, '· bitar utan översättning', pieces.filter(p => !(p in D)).length, 'av', pieces.length);
