// Plockar ut alla svenska textbitar (strängliteraler och mallsträngarnas fasta delar) ur spelets källkod.
// node tools/i18n/extract.mjs → tools/i18n/pieces.json (lista av unika bitar)
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const FILES = ['js/game.js', 'js/cards.js', 'js/cardui.js', 'js/gen.js', 'js/music.js', 'index.html'];
const SW = /[ÅÄÖåäö]|\b(OCH|ATT|DU|DIN|DITT|DINA|FÖR|MED|PÅ|AV|TILL|EN|ETT|INTE|HÄR|VAR|SOM|KAN|NÄR|FRÅN|UPP|NER|UT|IN|ALLA|ALLT|INGEN|INGET|NY|NYA|GULD|SKADA|HÄLSA|VAPEN|KORT|FIENDE|FIENDER|RUNDA|RUNDAN|VÅNING|TRYCK|SPELA|SKJUT|HOPPA|LADDA|STÄNG|TILLBAKA|och|att|du|din|för|med|på|av|till|en|ett|inte|som|kan|när|från|alla|ingen|skada|guld|kort|fiende|fiender|runda|våning|tryck|vapen)\b/;
const out = new Map();
function add(s, f) { s = s.replace(/\\n/g, '\n'); if (!/[A-Za-zÅÄÖåäö]{2}/.test(s)) return; if (!SW.test(s) && !/^[A-ZÅÄÖ][A-ZÅÄÖ0-9 :·–\-!?.,'%()+/]{2,}$/.test(s.trim())) return; if (/^(#|rgba?\(|\.|\/|assets|icon_|wall_|floor_|[a-z_]+$)/.test(s.trim())) return; const k = s; if (!out.has(k)) out.set(k, f); }
for (const f of FILES) {
  const src = fs.readFileSync(path.join(ROOT, f), 'utf8');
  if (f.endsWith('.html')) { // text mellan taggar och attribut
    for (const m of src.matchAll(/>([^<>{}]+)</g)) { const t = m[1].trim(); if (t) add(t, f); }
    for (const m of src.matchAll(/(?:placeholder|title|aria-label)="([^"]+)"/g)) add(m[1], f);
  }
  let i = 0; const n = src.length;
  while (i < n) {
    const c = src[i];
    if (c === '/' && src[i + 1] === '/') { const j = src.indexOf('\n', i); i = j < 0 ? n : j; continue; }
    if (c === '/' && src[i + 1] === '*') { const j = src.indexOf('*/', i + 2); i = j < 0 ? n : j + 2; continue; }
    if (c === "'" || c === '"') { let j = i + 1, s = ''; while (j < n && src[j] !== c) { if (src[j] === '\\') { s += src[j] + src[j + 1]; j += 2; continue; } if (src[j] === '\n') break; s += src[j]; j++; } add(s.replace(/\\'/g, "'").replace(/\\"/g, '"'), f); i = j + 1; continue; }
    if (c === '`') { let j = i + 1, s = '', depth = 0; const parts = []; while (j < n) { if (src[j] === '\\') { s += src[j] + src[j + 1]; j += 2; continue; } if (src[j] === '`') break; if (src[j] === '$' && src[j + 1] === '{') { parts.push(s); s = ''; depth = 1; j += 2; while (j < n && depth) { if (src[j] === '{') depth++; else if (src[j] === '}') depth--; else if (src[j] === "'" || src[j] === '"' || src[j] === '`') { const q = src[j]; j++; while (j < n && src[j] !== q) { if (src[j] === '\\') j++; j++; } } j++; } continue; } s += src[j]; j++; } parts.push(s); for (const p of parts) add(p, f); i = j + 1; continue; }
    i++;
  }
}
const arr = [...out.keys()].sort();
fs.writeFileSync(path.join(ROOT, 'tools/i18n/pieces.json'), JSON.stringify(arr, null, 0));
console.log(arr.length, 'bitar,', arr.reduce((a, s) => a + s.length, 0), 'tecken');
