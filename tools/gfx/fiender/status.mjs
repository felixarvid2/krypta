// FIENDER: en närbild per statuseffekt (brinner, fryst, gift, blöder, långsam, rädd, bedövad, champion) → out/<etikett>/st_<status>.png
import { setup } from '../../playtest/head.mjs'; import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const HERE = path.dirname(fileURLToPath(import.meta.url)), OUT = path.join(HERE, 'out', process.argv[2] || 'efter'); fs.mkdirSync(OUT, { recursive: true });
const { pg, ev, wait, start, done } = await setup(9747, path.join(OUT, 'tmp'));
await pg.addInitScript(() => { try { localStorage.setItem('krypta.settings.dator', JSON.stringify({ gamma: 1.6, autoLowFx: false })); } catch (e) {} });
await start('&seed=fiender');
await ev(() => { __game.run().practice = {}; for (const e of __game.ents()) { e.dead = true; e.gibbed = true; } const P = __game.P; P.iframe = 99999; P.hp = 999; const L = __game.lvl(); const r = (L.rooms || []).slice().sort((a, b) => b.w * b.h - a.w * a.h)[0]; const horiz = r.w >= r.h;
  P.x = horiz ? r.x + 1.2 : r.x + r.w / 2; P.y = horiz ? r.y + r.h / 2 : r.y + 1.2; P.a = horiz ? 0 : Math.PI / 2; for (const p of __game.props()) p.broken = true; });
await wait(2200); if (process.env.OFF) await ev(() => __game.gfxE.set(false)); // OFF=1: före-bilder i samma bygge
for (const st of ['burn', 'frozen', 'poison', 'bleed', 'slow', 'fleeT', 'stun', 'champion']) {
  await ev(st => { for (const e of __game.ents()) { e.dead = true; e.gibbed = true; } const P = __game.P; const e = __game.spawnEnemy('W', P.x + Math.cos(P.a) * 1.9, P.y + Math.sin(P.a) * 1.9); e.hp = e.maxHp = 999; e.alert = true; e.sleep = false; e.gBorn = -9; e.lx = __game.P.x; e.ly = __game.P.y; e.d = { ...e.d, speed: 0 }; if (st === 'champion') e.champion = true; else e[st] = 30; }, st);
  await wait(700); console.log(st, JSON.stringify(await ev(() => { const g = __game.gfxE.st; return { status: g.status, stars: g.stars, aura: g.aura, parts: g.parts }; })));
  const url = await ev(() => { const c = document.getElementById('screen'), sx = c.width / 320, k = document.createElement('canvas'); k.width = 480; k.height = 360; const g = k.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(c, 80 * sx, 10 * sx, 160 * sx, 120 * sx, 0, 0, 480, 360); return k.toDataURL('image/png'); });
  fs.writeFileSync(path.join(OUT, 'st_' + st + '.png'), Buffer.from(url.split(',')[1], 'base64'));
}
// död med aktiv status: brinnande (förkolnad, sjunker) och fryst (splittras) – 6 rutor var 250 ms
for (const st of ['burn', 'frozen']) {
  await ev(st => { for (const e of __game.ents()) { e.dead = true; e.gibbed = true; } const P = __game.P; const e = __game.spawnEnemy('W', P.x + Math.cos(P.a) * 1.9, P.y + Math.sin(P.a) * 1.9); e.alert = true; e.sleep = false; e.gBorn = -9; e.d = { ...e.d, speed: 0 }; window.__de = e; }, st);
  await wait(500); await ev(st => { const e = window.__de; e[st] = 5; __game.hurtEnemy(e, e.hp + 1.5, e.x, e.y); }, st);
  const fr = []; for (let k = 0; k < 6; k++) { fr.push(await ev(() => { const c = document.getElementById('screen'), sx = c.width / 320, k = document.createElement('canvas'); k.width = 320; k.height = 240; const g = k.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(c, 80 * sx, 10 * sx, 160 * sx, 120 * sx, 0, 0, 320, 240); return k.toDataURL('image/png'); })); await wait(250); }
  fr.forEach((u, k) => fs.writeFileSync(path.join(OUT, `dod_${st}_${k}.png`), Buffer.from(u.split(',')[1], 'base64')));
}
console.log('bilder i', OUT); await done();
