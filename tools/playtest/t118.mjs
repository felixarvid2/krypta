// t118 (version 25.1): egna himlar per biom. gfx/sky_<biom>.png laddas för slagfältet, öknen, skärselden, molnborgen, vulkanen,
// djungeln och fiskeläget; en våning i biomen ritar sin egen himmel (__game.sky.used() och pixlar ur himlens egna färger i en
// rendering utan färgton), vulkanens röda ton läggs inte på den egna himlen, skogen och kyrkogården har kvar natthimlen (med måne och
// moln), inomhus ritas ingen himmel, och inga sidfel. Alla väntetider räknas i speltid (__game.roles.t()).
import { setup } from './head.mjs';
const PORT = 9818;
const { pg, shot, ev, wait, ok, done } = await setup(PORT, 'out/t118');
const cerrs = []; pg.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|404/.test(m.text())) cerrs.push(m.text().slice(0, 200)); });
await pg.goto(`http://localhost:${PORT}/index.html?nolock=1`); await pg.waitForFunction('!document.getElementById("start").disabled', { timeout: 90000 });
const gt = () => ev(() => __game.roles.t());
const until = async (cond, sec, arg) => { const t0 = await gt(), w0 = Date.now(); for (;;) { if (cond && await ev(cond, arg)) return true; if ((await gt()) - t0 >= sec || Date.now() - w0 > 120000) return !cond; await wait(80); } };
const gwait = sec => until(null, sec);
await ev(() => { localStorage.removeItem('krypta.run'); const g = __game; g.profile.tutDone = true; g.settings.autoLowFx = false; g.settings.lowfx = false; g.settings.mouseLook = true; g.settings.noFlash = true; g.begin('new'); }); // noFlash: blixten lyser annars upp himlen och byter färgerna i mätningen
await wait(1500); await pg.keyboard.press('Escape'); await wait(500);
const OWN = ['battlefield', 'desert', 'purgatory', 'sky', 'volcano', 'jungle', 'harbor'];
const own = await ev(() => __game.sky && __game.sky.own());
ok(Array.isArray(own) && OWN.every(b => own.includes(b)), 'egna himlar laddas: ' + JSON.stringify(own));
ok(await ev(() => { const g = __game; return [...g.sky.own(), 'night'].every(b => { const c = g.sky.colors(b); return c.length > 8; }); }), 'varje himmel har pixlar (512x96)');
// en våning i biomen, stå på en öppen ruta under himlen och titta lite uppåt; räkna pixlar ur den egna himlens och natthimlens färger
const visit = (biome, seed) => ev(([biome, seed]) => {
  const g = __game, L = Gen.floor(seed, biome === 'purgatory' || biome === 'battlefield' ? 5 : 3, { biome }); g.run().depth = biome === 'purgatory' || biome === 'battlefield' ? 5 : 3; g.startLevel(L); return g.lvl().biome; }, [biome, seed]);
const measure = (biome) => ev(biome => {
  const g = __game, L = g.lvl(), M = L.map, sky = L.sky; for (const e of g.ents()) { e.alert = false; e.sleep = true; e.d = { ...e.d, speed: 0, dmg: 0 }; } g.P.hp = 999;
  let pos = null;
  if (sky) { const ray = (x, y, a) => { for (let d = 0.3; d < 10; d += 0.15) if (g.solid(x + Math.cos(a) * d, y + Math.sin(a) * d)) return d; return 10; };
    let bs = -1; for (let y = 1; y < M.length - 1; y++) for (let x = 1; x < M[0].length - 1; x++) { if (sky[y][x] !== '1' || g.solid(x + 0.5, y + 0.5) || /[ŃĐ]/.test(M[y][x])) continue; let r = 0; for (let k = 0; k < 8; k++) r += ray(x + 0.5, y + 0.5, k * Math.PI / 4); if (r > bs) { bs = r; pos = [x + 0.5, y + 0.5]; } } }
  if (pos) { g.P.x = pos[0]; g.P.y = pos[1]; }
  g.P.a = 0.7; g.P.look = 0.3; g.P.pitch = 0;
  const r = g.look.probe(), ownC = new Set(biome ? g.sky.colors(biome) : []), night = new Set(g.sky.colors('night'));
  let o = 0, n = 0; for (const c of r.px) { if (ownC.has(c >>> 0) || ownC.has(c | 0)) o++; if (night.has(c >>> 0) || night.has(c | 0)) n++; }
  g.P.look = 0;
  return { biome: L.biome, used: g.sky.used(), isOwn: g.sky.isOwn(), own: +(o / r.px.length).toFixed(3), night: +(n / r.px.length).toFixed(3), holes: r.holes, pos };
}, biome);
for (const [i, b] of OWN.entries()) {
  const lb = await visit(b, 4100 + i * 17);
  if (lb !== b) { ok(false, `${b}: bangeneratorn gav ${lb}`); continue; }
  await gwait(0.4);
  const m = await measure(b);
  ok(m.used === b && m.isOwn && m.own > 0.05 && m.own > m.night && m.holes === 0, `${b}: ritar sin egna himmel ` + JSON.stringify(m));
  if (b === 'volcano') ok(m.own > 0.05, 'vulkanen: den röda glödtonen läggs inte ovanpå den egna himlen (pixlarna har himlens egna färger)');
  await ev(() => { __game.P.look = 0.3; }); await gwait(0.15); await shot('sky_' + b); await ev(() => { __game.P.look = 0; });
}
// natthimlen finns kvar där ingen egen himmel finns
for (const [i, b] of ['forest', 'graveyard'].entries()) {
  const lb = await visit(b, 5100 + i * 13); await gwait(0.4);
  const m = await measure(null);
  ok(lb === b && m.used === 'night' && !m.isOwn && m.night > 0.05, `${b}: natthimlen som förut ` + JSON.stringify(m));
  ok(await ev(() => !__game.sky.own().includes(__game.lvl().biome)), `${b}: ingen egen himmel för biomen`);
  await shot('night_' + b);
}
// inomhus: ingen himmel alls
{ const lb = await visit('dungeon', 6101); await gwait(0.4); const m = await measure('desert');
  ok(lb === 'dungeon' && !m.isOwn && m.own < 0.01 && m.night < 0.01, 'inomhus (kryptan): ingen himmel ritas ' + JSON.stringify(m)); }
// lowfx: den egna himlen ritas fortfarande (bara måne, moln och stjärnfall faller bort på natthimlen)
await ev(() => { __game.settings.lowfx = true; });
{ await visit('desert', 7001); await gwait(0.4); const m = await measure('desert');
  ok(m.used === 'desert' && m.own > 0.05, 'lowfx: öknens egna himmel ritas fortfarande ' + JSON.stringify(m)); }
await ev(() => { __game.settings.lowfx = false; });
ok(cerrs.length === 0, 'inga konsolfel ' + cerrs.join(' / '));
await done();
