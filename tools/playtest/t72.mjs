import { setup } from './head.mjs';
const { pg, ev, wait, start, done } = await setup(8900, 'out/t72');
await start('&seed=72&biome=dungeon&god=1');
await ev(() => { const g = __game; g.switchWeapon(g.WEAPONS.findIndex(w => w.id === 'windgun')); g.P.has[g.WEAPONS.findIndex(w => w.id === 'windgun')] = true; g.switchWeapon(g.WEAPONS.findIndex(w => w.id === 'windgun')); }); await wait(1200);
await pg.screenshot({ path: 'out/t72/hud.png', clip: { x: 560, y: 500, width: 400, height: 100 } });
await done();
