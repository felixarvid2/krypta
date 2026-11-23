// VAPEN omgång 2: bildserier av projektiler, nedslag och explosioner.
// node tools/gfx/vapen/proj.mjs [etikett]  → tools/gfx/vapen/out/<etikett>/p_<serie>.png (GAME_JS=... för en äldre game.js)
import { setup } from '../../playtest/head.mjs'; import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url'; import { spawnSync } from 'child_process';
const HERE = path.dirname(fileURLToPath(import.meta.url)), TAG = process.argv[2] || 'nu', OUT = path.join(HERE, 'out', TAG);
fs.mkdirSync(OUT, { recursive: true });
const { pg, ev, wait, done } = await setup(9751, path.join(OUT, 'tmp'));
const cerr = new Set(); pg.on('console', m => { if (m.type() === 'error' && !/Failed to load/.test(m.text())) cerr.add(m.text().slice(0, 160)); });
await pg.goto('http://localhost:9751/index.html?nolock=1'); await pg.waitForFunction('!document.getElementById("start").disabled', null, { timeout: 60000 });
await ev(() => { localStorage.removeItem('krypta.run'); __game.profile.tutDone = true; const e = document.getElementById('seed'); if (e) e.value = 'krypt'; __game.begin('new'); }); await wait(1500); await pg.keyboard.press('Escape'); await wait(4500);
await ev(() => { for (const e of __game.ents()) e.dead = true; const P = __game.P; P.iframe = 9999; P.hp = 999; __game.settings.autoLowFx = false; });
// vänd mot den längsta fria riktningen
await ev(() => { const P = __game.P; let best = 0, ba = P.a; for (let a = 0; a < 6.28; a += 0.2) { let d = 0; while (d < 12 && !__game.solid(P.x + Math.cos(a) * d, P.y + Math.sin(a) * d)) d += 0.2; if (d > best) { best = d; ba = a; } } P.a = ba; window.__free = best; });
const free = await ev(() => window.__free); console.log('fri sträcka', free.toFixed(1));
const grab = () => ev(() => { (window.__seq = window.__seq || []).push(document.getElementById('screen').toDataURL()); });
const save = async (name) => { const fr = await ev(() => { const f = window.__seq || []; window.__seq = []; return f; }); const dir = path.join(OUT, 'tmp', name); fs.mkdirSync(dir, { recursive: true });
  fr.forEach((u, i) => fs.writeFileSync(path.join(dir, String(i).padStart(2, '0') + '.png'), Buffer.from(u.split(',')[1], 'base64')));
  spawnSync('python3', ['-c', `import sys,glob\nfrom PIL import Image\nfs=sorted(glob.glob(sys.argv[1]+'/*.png'));im=[Image.open(f).crop((40,10,280,170)) for f in fs];w,h=im[0].size;c=min(4,len(im));r=(len(im)+c-1)//c\nm=Image.new('RGB',(c*w*2,r*h*2))\nfor i,a in enumerate(im): m.paste(a.resize((w*2,h*2),Image.NEAREST),((i%c)*w*2,(i//c)*h*2))\nm.save(sys.argv[2])`, dir, path.join(OUT, 'p_' + name + '.png')]); };
const series = async (name, n, ms, act) => { await ev(() => { window.__seq = []; }); if (act) await act(); for (let i = 0; i < n; i++) { await grab(); await wait(ms); } await save(name); };
const D = Math.min(4, free - 0.6);
await series('explosion', 12, 110, () => ev(D => { const P = __game.P; __game.explode(P.x + Math.cos(P.a) * D, P.y + Math.sin(P.a) * D, 0, 2.0); }, D));
await wait(2500);
await series('fiendeskott', 8, 90, () => ev(D => { const P = __game.P, c = Math.cos(P.a), sn = Math.sin(P.a); [['orb2', -0.15], ['bolt', 0.05], ['ice', 0.25]].forEach(([k, h], j) => { const d = D * (0.55 + j * 0.15); let o = 1.4; while (o > 0.2 && __game.solid(P.x + c * d + sn * o, P.y + sn * d - c * o)) o -= 0.2; __game.projectiles().push({ x: P.x + c * d + sn * o, y: P.y + sn * d - c * o, z: 0.5 + h, vx: -sn * 2.4, vy: c * 2.4, kind: k, dmg: 0, src: { x: P.x, y: P.y }, life: 1.6 }); }); }, D));
await wait(1500);
await series('fiendeskott_mot', 8, 70, () => ev(D => { const P = __game.P, c = Math.cos(P.a), sn = Math.sin(P.a); __game.projectiles().push({ x: P.x + c * (D + 0.5), y: P.y + sn * (D + 0.5), z: 0.5, vx: -c * 4, vy: -sn * 4, kind: 'orb2', dmg: 0, src: { x: P.x, y: P.y }, life: 2 }); }, D));
const give = id => ev(id => { const P = __game.P, WS = __game.WS, i = __game.WEAPONS.findIndex(w => w.id === id); P.has[i] = true; P.weapon = i; P.mags[i] = __game.WEAPONS[i].mag; Object.assign(P.ammo, { lgren: 20, flares: 20, p9: 100 }); WS.state = 'idle'; WS.shot = 99; WS.cd = 0; }, id);
await give('launcher'); await wait(300); await series('granat', 8, 70, () => ev(() => __game.fire()));
await wait(2500);
await give('flaregun'); await wait(300); await series('bloss', 8, 70, () => ev(() => __game.fire()));
await wait(2000);
await give('pistol'); await ev(() => { const P = __game.P; let best = 99, ba = P.a; for (let a = 0; a < 6.28; a += 0.1) { let d = 0; while (d < 12 && !__game.solid(P.x + Math.cos(a) * d, P.y + Math.sin(a) * d)) d += 0.1; if (d > 1.2 && d < best) { best = d; ba = a; } } P.a = ba; }); await wait(1200);
await series('nedslag', 8, 60, async () => { for (let i = 0; i < 3; i++) { await ev(() => { __game.WS.cd = 0; __game.fire(); }); await wait(120); } });
console.log('bilder i', OUT); console.log('konsolfel:', [...cerr].slice(0, 5).join(' | ') || 'inga');
await done();
