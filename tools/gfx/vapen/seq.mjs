// VAPEN: bildserier av förstapersonsvapnens animationer (avfyra, ladda om, byta, svinga, landa, springa, inspektera).
// node tools/gfx/vapen/seq.mjs [etikett]  → tools/gfx/vapen/out/<etikett>/<serie>.png (rutor sida vid sida, 2x)
import { setup } from '../../playtest/head.mjs'; import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url'; import { spawnSync } from 'child_process';
const HERE = path.dirname(fileURLToPath(import.meta.url)), TAG = process.argv[2] || 'nu', OUT = path.join(HERE, 'out', TAG);
fs.mkdirSync(OUT, { recursive: true });
const { pg, ev, wait, ok, start, done } = await setup(9711, path.join(OUT, 'tmp'));
const cerr = new Set(); pg.on('console', m => { if (m.type() === 'error') cerr.add(m.text().slice(0, 160)); });
await start('&seed=vapen');
await ev(() => { for (const e of __game.ents()) e.dead = true; const P = __game.P; P.iframe = 9999; P.hp = 999; for (const id of ['pistol', 'shotgun', 'rifle', 'smg', 'nailgun', 'axe', 'dbshotgun']) { const i = __game.WEAPONS.findIndex(w => w.id === id); P.has[i] = true; } Object.assign(P.ammo, { p9: 200, shells: 50, r556: 150, nails: 300 }); });
await wait(300); console.log('läge', await ev(() => __game.state()));
const idx = id => ev(id => __game.WEAPONS.findIndex(w => w.id === id), id);
const setW = async id => { const i = await idx(id); await ev(i => { const P = __game.P, WS = __game.WS; P.weapon = i; P.mags[i] = __game.WEAPONS[i].mag; WS.state = 'idle'; WS.t = 0; WS.shot = 99; }, i); await wait(250); };
// samla rutor i sidan och lägg dem sida vid sida
const grab = () => ev(() => { (window.__seq = window.__seq || []).push(document.getElementById('screen').toDataURL()); });
const save = async (name) => { // rutorna sparas en och en och läggs ihop med PIL (2x, 6 per rad)
  const fr = await ev(() => { const f = window.__seq || []; window.__seq = []; return f; }); const dir = path.join(OUT, 'tmp', name); fs.mkdirSync(dir, { recursive: true });
  fr.forEach((u, i) => fs.writeFileSync(path.join(dir, String(i).padStart(2, '0') + '.png'), Buffer.from(u.split(',')[1], 'base64')));
  spawnSync('python3', ['-c', `import sys,glob\nfrom PIL import Image\nfs=sorted(glob.glob(sys.argv[1]+'/*.png'));im=[Image.open(f) for f in fs];im=[a.crop((90,60,300,200)) for a in im];w,h=im[0].size;c=min(4,len(im));r=(len(im)+c-1)//c\nm=Image.new('RGB',(c*w*2,r*h*2))\nfor i,a in enumerate(im): m.paste(a.resize((w*2,h*2),Image.NEAREST),((i%c)*w*2,(i//c)*h*2))\nm.save(sys.argv[2])`, dir, path.join(OUT, name + '.png')]); };
const series = async (name, n, ms, act) => { await ev(() => { window.__seq = []; }); if (act) await act(); for (let i = 0; i < n; i++) { await grab(); await wait(ms); } await save(name); };
await setW('pistol'); await series('pistol_eld', 12, 60, () => ev(() => { __game.fire(); }));
await setW('rifle'); await series('gevar_skur', 12, 90, () => ev(() => { __game.setMouse(true); setTimeout(() => __game.setMouse(false), 900); }));
await setW('rifle'); await ev(() => { __game.P.mags[__game.P.weapon] = 3; }); await series('gevar_omladdning', 12, 140, () => ev(() => __game.startReload()));
await setW('shotgun'); await ev(() => { __game.P.mags[__game.P.weapon] = 3; }); await series('hagel_omladdning', 12, 180, () => ev(() => __game.startReload()));
await setW('dbshotgun'); await ev(() => { __game.P.mags[__game.P.weapon] = 0; }); await series('dubbel_omladdning', 12, 120, () => ev(() => __game.startReload()));
await setW('smg'); await series('vapenbyte', 12, 40, async () => { const i = await idx('shotgun'); await ev(i => __game.switchWeapon(i), i); });
await setW('axe'); await wait(300); await series('yxa_sving', 12, 90, () => ev(() => { __game.settings.gameSpeed = 0.25; __game.WS.cd = 0; __game.fire(); })); await ev(() => { __game.settings.gameSpeed = 1; });
await setW('pistol'); await series('sidled_glid', 8, 120, () => ev(() => { const P = __game.P; P.slide = 0.55; P.vx = -Math.sin(P.a) * 4; P.vy = Math.cos(P.a) * 4; }));
await setW('nailgun'); await series('spik_skur_glod', 12, 240, () => ev(() => { __game.setMouse(true); setTimeout(() => __game.setMouse(false), 2600); }));
await setW('pistol'); await series('landning', 10, 50, () => ev(() => { const P = __game.P; P.jz = 0.6; P.jv = -4; }));
await setW('pistol'); await series('inspektera', 10, 170, () => ev(() => { __game.WS.inspect = 1.6; }));
await setW('rifle'); await ev(() => { __game.P.mags[__game.P.weapon] = 3; }); await series('perfekt_omladdning', 8, 60, async () => { await ev(() => { __game.startReload(); __game.WS.t = __game.WEAPONS[__game.P.weapon].reload * 0.37; }); await pg.keyboard.press('KeyR'); });
await setW('pistol'); await series('springa', 6, 120, () => ev(() => { __game.P.runK = 1; }));
console.log('bilder i', OUT); console.log('konsolfel:', [...cerr].slice(0, 6).join(' | ') || 'inga');
await done();
