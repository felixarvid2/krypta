// VAPENSTIL: skärmbilder ur spelet med de omgjorda vapnen i handen (vila + två rutor av avfyrningen).
// node tools/gfx/vapen/stil.mjs [etikett] [vapen,vapen,...]  → tools/gfx/vapen/out/<etikett>/stil_<n>.png
import { setup } from '../../playtest/head.mjs'; import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url'; import { spawnSync } from 'child_process';
const HERE = path.dirname(fileURLToPath(import.meta.url)), TAG = process.argv[2] || 'stil', OUT = path.join(HERE, 'out', TAG);
const IDS = (process.argv[3] || 'shotgun,axe,flamer,launcher,nailgun,staff,bow,harpoon,sawlauncher,spear,hammer,musket,steamcannon,scimitar,trapthrower,pistol').split(',');
fs.mkdirSync(path.join(OUT, 'tmp'), { recursive: true });
const { pg, ev, wait, start, done } = await setup(9741, path.join(OUT, 'tmp'));
const cerr = new Set(); pg.on('console', m => { if (m.type() === 'error') cerr.add(m.text().slice(0, 160)); });
await start('&seed=vapen');
await ev(() => { for (const e of __game.ents()) e.dead = true; const P = __game.P; P.iframe = 9999; P.hp = 999; __game.WEAPONS.forEach((w, i) => { P.has[i] = true; if (w.ammo) P.ammo[w.ammo] = 99; }); });
await wait(300);
const shot = async (name) => { const u = await ev(() => document.getElementById('screen').toDataURL()); fs.writeFileSync(path.join(OUT, 'tmp', name + '.png'), Buffer.from(u.split(',')[1], 'base64')); };
const names = [];
for (const id of IDS) {
  const i = await ev(id => __game.WEAPONS.findIndex(w => w.id === id), id); if (i < 0) { console.log('saknas', id); continue; }
  await ev(i => { const P = __game.P, WS = __game.WS; P.weapon = i; P.mags[i] = __game.WEAPONS[i].mag; WS.state = 'idle'; WS.t = 0; WS.shot = 99; WS.cd = 0; }, i); await wait(350);
  await shot(id + '_0'); await ev(() => { __game.settings.gameSpeed = 0.3; __game.WS.cd = 0; __game.fire(); }); await wait(160); await shot(id + '_1'); await wait(260); await shot(id + '_2');
  await ev(() => { __game.settings.gameSpeed = 1; }); await wait(500); names.push(id);
}
spawnSync('python3', ['-c', `import sys
from PIL import Image
d,o=sys.argv[1],sys.argv[2];ids=sys.argv[3].split(',')
for p in range(0,len(ids),4):
    part=ids[p:p+4];m=Image.new('RGB',(3*230*2,len(part)*140*2))
    for r,i in enumerate(part):
        for c in range(3):
            a=Image.open(f'{d}/{i}_{c}.png').convert('RGB').crop((90,60,320,200));m.paste(a.resize((460,280),Image.NEAREST),(c*460,r*280))
    m.save(f'{o}/stil_{p//4}.png')`, path.join(OUT, 'tmp'), OUT, names.join(',')]);
console.log('bilder i', OUT); console.log('konsolfel:', [...cerr].slice(0, 6).join(' | ') || 'inga');
await done();
