// Språket: spelets källtext är svensk. Engelska är standard; svenska väljs i inställningarna (settings.lang = 'sv').
// I18N.t(s) översätter en text vid visning med ordlistan window.I18N_EN (svenska bitar → engelska, byggd av tools/i18n/build.mjs):
// först hela strängen, sedan bit för bit (längsta kända bit vid varje ordbörjan), så att sammansatta texter som
// 'NY FIENDE: ' + namn eller `VÅNING ${n}` också översätts. All DOM-text översätts av en MutationObserver.
(function () {
  const D = window.I18N_EN || {};
  let lang = 'en';
  try {
    const q = new URLSearchParams(location.search).get('lang');
    let dev = 'dator'; try { dev = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window ? 'mobil' : 'dator'; } catch (e) { /* dator */ } // samma nyckel som DEVICE i game.js
    const s = JSON.parse(localStorage.getItem('krypta.settings.' + dev) || localStorage.getItem('krypta.settings') || '{}') || {};
    const qs = new URLSearchParams(location.search);
    lang = q === 'sv' || q === 'en' ? q : qs.has('nolock') ? 'sv' : s.lang === 'sv' ? 'sv' : 'en'; // nolock = testkörning: testerna läser svensk text om inte ?lang=en anges
  } catch (e) { /* ingen lagring: engelska */ }
  const isL = c => /[A-Za-z0-9ÅÄÖåäöÉéÜü]/.test(c);
  const exact = new Map(), upper = new Map(), idx = new Map();
  const addIdx = (sv, en) => { // bitar för ord-för-ord-matchningen: börjar på en bokstav; gemensamt prefix utan bokstäver (t.ex. "+10 % ") tas bort
    let ts = sv.trim(), te = en.trim(); const pm = ts.match(/^[^A-Za-zÅÄÖåäöÉé]+/);
    if (pm) { if (!te.startsWith(pm[0])) return; ts = ts.slice(pm[0].length); te = te.slice(pm[0].length); }
    const m = ts.toUpperCase().match(/^[A-Z0-9ÅÄÖÉÜ]+/); if (!m || ts.length < 2) return;
    const a = idx.get(m[0]) || []; a.push([ts.toUpperCase(), te]); idx.set(m[0], a);
  };
  for (const sv in D) {
    const en = D[sv]; if (typeof en !== 'string' || en === sv) continue;
    exact.set(sv, en); upper.set(sv.toUpperCase(), en); addIdx(sv, en);
    if (sv.includes('\n')) { const ls = sv.split('\n'), le = en.split('\n'); if (ls.length === le.length) ls.forEach((l, i) => { if (l.trim() && l !== le[i]) { if (!exact.has(l)) { exact.set(l, le[i]); upper.set(l.toUpperCase(), le[i]); } addIdx(l, le[i]); } }); }
  }
  for (const a of idx.values()) a.sort((p, q) => q[0].length - p[0].length);
  const fixCase = (en, src) => /[a-zåäö]/.test(src) ? en : en.toUpperCase();
  const missing = new Set();
  function conv(s) {
    if (!/[A-Za-zÅÄÖåäö]{2}/.test(s)) return s;
    let e = exact.get(s); if (e !== undefined) return e;
    const t = s.trim();
    if (t !== s && t) { e = exact.get(t); if (e === undefined) { const u = upper.get(t.toUpperCase()); if (u !== undefined) e = fixCase(u, t); } if (e !== undefined) return s.replace(t, e); }
    e = upper.get(s.toUpperCase()); if (e !== undefined) return fixCase(e, s);
    const U = s.toUpperCase(); let out = '', i = 0;
    while (i < s.length) {
      if (!isL(s[i]) || (i > 0 && isL(s[i - 1]))) { out += s[i]; i++; continue; }
      let j = i; while (j < s.length && isL(s[j])) j++;
      const c = idx.get(U.slice(i, j)); let hit = null;
      if (c) for (const p of c) { if (U.startsWith(p[0], i)) { const end = i + p[0].length; if (end >= s.length || !isL(s[end]) || !isL(p[0][p[0].length - 1])) { hit = p; break; } } }
      if (hit) { out += fixCase(hit[1], s.slice(i, i + hit[0].length)); i += hit[0].length; } else { out += s.slice(i, j); i = j; }
    }
    if ((/[ÅÄÖåäö]/.test(out) || /\b(OCH|ATT|DU|TILL|MED|SOM|INTE|ETT|DIN|DITT|NYA|GULD|KVAR|SPELA|TRYCK|ALLA|SKADA|FIENDE|FIENDER|RUNDA|KORT|VID|EFTER|UNDER|OM)\b/i.test(out)) && missing.size < 3000) missing.add(s);
    return out;
  }
  const cache = new Map();
  function t(s) {
    if (lang !== 'en' || s === undefined || s === null) return s;
    s = String(s); let r = cache.get(s); if (r !== undefined) return r;
    r = conv(s); if (cache.size > 30000) cache.clear(); cache.set(s, r); return r;
  }
  // DOM: översätt textnoder och några attribut när de skapas eller ändras
  const seen = new WeakMap(), ATTR = ['placeholder', 'title', 'aria-label'];
  function node(n) { const v = n.data; if (seen.get(n) === v) return; const r = t(v); if (r !== v) n.data = r; seen.set(n, n.data); }
  function el(e) { for (const a of ATTR) { const v = e.getAttribute && e.getAttribute(a); if (v) { const r = t(v); if (r !== v) e.setAttribute(a, r); } } }
  function walk(root) {
    if (root.nodeType === 3) { const p = root.parentNode; if (!p || !/^(SCRIPT|STYLE|TEXTAREA)$/.test(p.nodeName)) node(root); return; }
    if (root.nodeType !== 1 || /^(SCRIPT|STYLE|TEXTAREA)$/.test(root.nodeName)) return;
    el(root); const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, { acceptNode: n => n.nodeType === 1 && /^(SCRIPT|STYLE|TEXTAREA)$/.test(n.nodeName) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT });
    let n; while ((n = w.nextNode())) { if (n.nodeType === 3) node(n); else el(n); }
  }
  function start() {
    if (lang !== 'en' || !document.body) return;
    document.documentElement.lang = 'en'; walk(document.body);
    new MutationObserver(ms => { for (const m of ms) { if (m.type === 'characterData') { const p = m.target.parentNode; if (p && !/^(SCRIPT|STYLE|TEXTAREA)$/.test(p.nodeName)) node(m.target); } else if (m.type === 'attributes') el(m.target); else for (const a of m.addedNodes) walk(a); } })
      .observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTR });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
  window.I18N = { t, lang: () => lang, missing, size: exact.size };
})();
