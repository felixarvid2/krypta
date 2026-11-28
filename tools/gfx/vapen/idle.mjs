// VAPEN omgång 3: vapnens viloliv (stav, prisma, drömstav, eldkastare, signalpistol, legendariskt vapen).
// node tools/gfx/vapen/idle.mjs [etikett] → tools/gfx/vapen/out/<etikett>/i_<vapen>.png (4 rutor, 250 ms isär; GAME_JS=... för äldre kod)
import { setup } from '../../playtest/head.mjs'; import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url'; import { spawnSync } from 'child_process';
const HERE = path.dirname(fileURLToPath(import.meta.url)), TAG = process.argv[2] || 'nu', OUT = path.join(HERE, 'out', TAG);
fs.mkdirSync(OUT, { recursive: true });
const { pg, ev, wait, done } = await setup(9754, path.join(OUT, 'tmp'));
await pg.goto('http://localhost:9754/index.html?nolock=1'); await pg.waitForFunction('!document.getElementById("start").disabled', null, { timeout: 60000 });
await ev(() => { localStorage.removeItem('krypta.run'); __game.profile.tutDone = true; const e = document.getElementById('seed'); if (e) e.value = 'krypt'; __game.begin('new'); }); await wait(1500); await pg.keyboard.press('Escape'); await wait(4500);
await ev(() => { for (const e of __game.ents()) e.dead = true; __game.P.iframe = 9999; __game.settings.autoLowFx = false; });
for (const id of ['staff', 'prism', 'dreamstaff', 'flamer', 'flaregun', 'legend']) {
  await ev(id => { const g = __game, P = g.P; let wid = id; if (id === 'legend') { const L = g.LEGENDS, k = Object.keys(L).find(k => L[k].base === 'shotgun') || Object.keys(L)[0]; g.giveLegend(k, 'TEST'); wid = L[k].base; } const i = g.WEAPONS.findIndex(w => w.id === wid); P.has[i] = true; P.weapon = i; g.WS.state = 'idle'; g.WS.shot = 99; }, id);
  await wait(1200); const fr = [];
  for (let i = 0; i < 4; i++) { fr.push(await ev(() => document.getElementById('screen').toDataURL())); await wait(id === 'legend' ? 120 : 250); }
  const dir = path.join(OUT, 'tmp', id); fs.mkdirSync(dir, { recursive: true }); fr.forEach((u, i) => fs.writeFileSync(path.join(dir, i + '.png'), Buffer.from(u.split(',')[1], 'base64')));
  spawnSync('python3', ['-c', `import sys,glob\nfrom PIL import Image\nfs=sorted(glob.glob(sys.argv[1]+'/*.png'));im=[Image.open(f).crop((100,40,300,200)) for f in fs];w,h=im[0].size\nm=Image.new('RGB',(4*w*2,h*2))\nfor i,a in enumerate(im): m.paste(a.resize((w*2,h*2),Image.NEAREST),(i*w*2,0))\nm.save(sys.argv[2])`, dir, path.join(OUT, 'i_' + id + '.png')]);
}
console.log('bilder i', OUT); await done();
