// FIENDER: bildserier av fiendernas och bossarnas animationer (träff, död, sprängd, spawn, flygare med skugga, skytt som laddar, boss).
// node tools/gfx/fiender/seq.mjs [etikett]  → tools/gfx/fiender/out/<etikett>/<serie>.png (rutor sida vid sida, 2x)
// PERF=1: mät också genomsnittlig tid per bildruta (rAF-anropet) med 4x strypt processor och 12 fiender i bild.
import { setup } from '../../playtest/head.mjs'; import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const HERE = path.dirname(fileURLToPath(import.meta.url)), TAG = process.argv[2] || 'nu', OUT = path.join(HERE, 'out', TAG);
fs.mkdirSync(OUT, { recursive: true });
const { pg, ev, wait, start, done } = await setup(9741, path.join(OUT, 'tmp'));
await pg.addInitScript(() => { try { localStorage.setItem('krypta.settings.dator', JSON.stringify({ gamma: 1.6, autoLowFx: false })); } catch (e) {} const raf = window.requestAnimationFrame.bind(window); window.__ft = []; window.requestAnimationFrame = cb => raf(t => { const a = performance.now(); cb(t); if (window.__ftOn) window.__ft.push(performance.now() - a); }); });
await start('&seed=fiender');
await ev(() => { __game.run().practice = {}; for (const e of __game.ents()) { e.dead = true; e.gibbed = true; } const P = __game.P; P.iframe = 99999; P.hp = 999; __game.settings.autoLowFx = false; });
await wait(400);
// ställ spelaren i bortre änden av det största rummet, titta längs rummet, ta bort rekvisita i vägen
const stage = () => ev(() => { const L = __game.lvl(), P = __game.P; const r = (L.rooms || []).slice().sort((a, b) => b.w * b.h - a.w * a.h)[0]; if (!r) return; const horiz = r.w >= r.h;
  P.x = horiz ? r.x + 1.2 : r.x + r.w / 2; P.y = horiz ? r.y + r.h / 2 : r.y + 1.2; P.a = horiz ? 0 : Math.PI / 2; for (const p of __game.props()) if (p.x >= r.x - 1 && p.x <= r.x + r.w + 1 && p.y >= r.y - 1 && p.y <= r.y + r.h + 1) p.broken = true; });
await stage(); await wait(300);
const OFF = !!process.env.OFF; // OFF=1: FIENDERs effekter avstängda (före-bilder i samma bygge)
await ev(off => { if (__game.gfxE) __game.gfxE.set(!off); }, OFF);
const clear = () => ev(() => { for (const e of __game.ents()) if (!e.boss) { e.dead = true; e.gibbed = true; } __game.particles().length = 0; });
const put = (type, d = 2.1, side = 0) => ev(([type, d, side]) => { const P = __game.P; const e = __game.spawnEnemy(type, P.x + Math.cos(P.a) * d - Math.sin(P.a) * side, P.y + Math.sin(P.a) * d + Math.cos(P.a) * side); e.alert = false; e.sleep = true; return __game.ents().indexOf(e); }, [type, d, side]);
const grab = (full = false) => ev(full => { const c = document.getElementById('screen'); const k = document.createElement('canvas'); const sx = c.width / 320, w = (full ? 320 : 128) * sx, h = (full ? 200 : 96) * sx; k.width = full ? 480 : 384; k.height = full ? 300 : 288; const g = k.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(c, full ? 0 : 96 * sx, full ? 0 : 46 * sx, w, h, 0, 0, k.width, k.height); (window.__seq = window.__seq || []).push(k); }, full);
const save = async (name) => { const url = await ev(() => { const fr = window.__seq || [], cols = Math.min(4, fr.length), rows = Math.ceil(fr.length / cols), w = fr[0].width, h = fr[0].height; const m = document.createElement('canvas'); m.width = cols * w; m.height = rows * h; const g = m.getContext('2d'); g.imageSmoothingEnabled = false; fr.forEach((f, i) => g.drawImage(f, (i % cols) * w, Math.floor(i / cols) * h)); window.__seq = []; return m.toDataURL('image/png'); }); fs.writeFileSync(path.join(OUT, name + '.png'), Buffer.from(url.split(',')[1], 'base64')); };
const series = async (name, n, ms, act, full = false) => { await ev(() => { window.__seq = []; }); if (act) await act(); for (let i = 0; i < n; i++) { await grab(full); await wait(ms); } await save(name); };
// närstridare träffas
await clear(); let i = await put('W'); await wait(300);
await series('traff', 12, 45, () => ev(i => { const e = __game.ents()[i]; e.hp = 999; e.maxHp = 999; __game.hurtEnemy(e, 3, e.x, e.y); }, i));
// dör (vanligt)
await clear(); i = await put('W'); await wait(300);
await series('dod', 12, 110, () => ev(i => { const e = __game.ents()[i]; __game.hurtEnemy(e, e.hp + 0.5, e.x, e.y); }, i));
// sprängs i bitar (överdöd), skelett, slem, konstruktion
for (const [t, n] of [['W', 'sprangd_kott'], ['S', 'sprangd_ben'], ['L', 'sprangd_slem'], ['+', 'sprangd_rustning']]) {
  await clear(); i = await put(t); await wait(300);
  await series(n, 12, 70, () => ev(i => { const e = __game.ents()[i]; __game.hurtEnemy(e, e.maxHp * 3, e.x, e.y); }, i));
}
// spawn mitt i striden (arenavåg)
await clear(); await wait(300);
await series('spawn', 12, 60, () => put('W'));
// flygare med skugga
await clear(); i = await put('X', 2.2); await wait(300);
await series('flygare', 6, 120);
// närstridare som slår (sträcker på sig före slaget, trycks ihop i slaget)
await clear(); i = await put('S', 1.6); await wait(600);
await series('narstrid', 12, 50, () => ev(i => { const e = __game.ents()[i]; e.sleep = false; e.alert = true; e.state = 'attack'; e.t = 0; e.didHit = false; }, i));
// flygare dör och faller till golvet
await clear(); i = await put('X', 2.2); await wait(600);
await series('flygare_dod', 8, 60, () => ev(i => { const e = __game.ents()[i]; e.alert = true; e.sleep = false; __game.hurtEnemy(e, e.hp + 0.05, e.x, e.y); }, i));
// skytt som laddar (telegraf)
await clear(); i = await put('Ä', 3.2); await wait(200);
await series('skytt', 12, 70, () => ev(i => { const e = __game.ents()[i]; e.sleep = false; e.alert = true; e.state = 'attack'; e.t = 0; e.didHit = false; }, i));
// statuseffekter: fyra orker sida vid sida (omgång 2)
for (const [name, sts] of [['status', ['burn', 'frozen', 'poison', 'stun']], ['status2', ['bleed', 'slow', 'fleeT', 'champion']]]) {
  await clear(); const ids = []; for (let k = 0; k < 4; k++) ids.push(await put('W', 2.6, (k - 1.5) * 0.75)); await wait(500);
  await series(name, 8, 120, () => ev(([ids, sts]) => { ids.forEach((i, k) => { const e = __game.ents()[i]; e.hp = e.maxHp = 999; if (sts[k] === 'champion') e.champion = true; else e[sts[k]] = 30; }); }, [ids, sts]), true);
}
if (process.env.PERF) {
  await clear(); for (let k = 0; k < 12; k++) await put('WSLX'[k % 4], 2.5 + (k % 4) * 0.8, (k % 3 - 1) * 1.2);
  const cdp = await pg.context().newCDPSession(pg); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await ev(() => { window.__ft = []; window.__ftOn = true; for (const [n, e] of __game.ents().entries()) if (!e.dead && n % 2 === 0) __game.hurtEnemy(e, 0.1, e.x, e.y); });
  await wait(2500); await ev(() => { for (const e of __game.ents()) if (!e.dead && Math.random() < 0.5) __game.hurtEnemy(e, e.maxHp * 3, e.x, e.y); }); await wait(2500);
  const ft = await ev(() => { window.__ftOn = false; const a = window.__ft.slice().sort((p, q) => p - q); return { n: a.length, mean: a.reduce((s, v) => s + v, 0) / a.length, p95: a[Math.floor(a.length * 0.95)] }; });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  console.log('PERF', JSON.stringify(ft)); fs.writeFileSync(path.join(OUT, 'perf.json'), JSON.stringify(ft));
}
// boss: träff och fasbyte
await ev(() => { __game.showTitle(); __game.beginBossHunt(); }); await wait(600);
await pg.click('.cu-opt >> nth=0'); await series('boss_intro', 12, 180, null, true); await wait(800); await stage(); await ev(off => { if (__game.gfxE) __game.gfxE.set(!off); }, OFF);
await ev(() => { const P = __game.P; P.iframe = 99999; P.hp = 999; const b = __game.boss(); if (b) { b.x = P.x + Math.cos(P.a) * 4.5; b.y = P.y + Math.sin(P.a) * 4.5; b.stun = 99; } });
await wait(300);
await series('boss_fas', 12, 80, () => ev(() => { const b = __game.boss(); if (b) __game.hurtEnemy(b, b.hp - b.maxHp * 0.6, b.x, b.y); }));
await series('boss_dod', 12, 250, () => ev(() => { const b = __game.boss(); if (b) __game.hurtEnemy(b, b.hp + 1, b.x, b.y); }));
console.log('bilder i', OUT);
await done();
