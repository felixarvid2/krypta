// t121: version 26A – MYNTET (kortet SKARPSKYTTENS MYNT, mod coin). Kontroller: kortet finns (ovanligt, låses upp för själar, vanligt
// mod-kort och inte en vapenuppgradering); utan kortet siktar pistolens högerklick som förut; med kortet kastar högerklick ett mynt
// (siktet går inte in), högst 4 mynt och ett nytt var 4:e sekund; med VÄXLA SIKTE (och ALT på pekskärm) blir två tryck två mynt.
// Ett pistolskott på myntet studsar till en fiende utanför hårkorset: huvudträff och minst 2× skada; två mynt ger kedja (×2) och
// mer skada; ett mynt prioriterar en egen granat framför fienden (sprängskott); ett mynt på golvet går inte att träffa;
// __game.v26a.set('coin', false) stänger av kastet. Inga sidfel. Väntetider i speltid (__game.roles.t()).
import { setup } from './head.mjs';
const PORT = 9821;
const { pg, ev, wait, ok, done } = await setup(PORT, 'out/t121');
const cerr = []; pg.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|favicon/.test(m.text())) cerr.push(m.text().slice(0, 160)); }); // spriteError skriver bara till konsolen
const load = async (q = '') => { await pg.goto(`http://localhost:${PORT}/index.html?nolock=1${q}`); await pg.waitForFunction('!document.getElementById("start").disabled', { timeout: 90000 }); };
await load();
const card = await ev(() => { const c = Cards.byId('skarpskyttens_mynt'); return c && { rarity: c.rarity, unlock: c.unlock, mods: c.mods, weapon: c.weapon || null, wup: c.wup || null, text: c.text }; });
ok(card && card.rarity === 'ovanlig' && card.unlock >= 10 && card.mods.coin === 1 && !card.weapon && !card.wup, `kortet SKARPSKYTTENS MYNT är ett ovanligt mod-kort som låses upp ${JSON.stringify(card)}`);

const sceneFn = o => { const g = __game; g.profile.tutDone = true; g.settings.autoLowFx = false; g.settings.lowfx = true; g.settings.toggleAim = !!o.toggle;
  const W = o.W, H = o.H, grid = []; for (let y = 0; y < H; y++) { const r = []; for (let x = 0; x < W; x++) r.push(x === 0 || y === 0 || x === W - 1 || y === H - 1 ? '1' : '.'); grid.push(r); }
  grid[o.p[1]][o.p[0]] = 'P'; grid[1][W - 2] = 'x';
  for (const [t, x, y] of o.en) grid[y][x] = t;
  g.playCustom({ grid, biome: 'dungeon' });
  const E = g.ents(), spec = E.filter(e => !e.boss).map(e => [e.type, e.x, e.y]); E.length = 0;
  for (const [t, x, y] of spec) g.spawnEnemy(t, x, y);
  for (const e of E) { e.d = { ...e.d, dmg: 0, speed: 0 }; e.base = { speed: 0, cd: e.d.cd }; e.hp = e.maxHp = 500; }
  g.P.hp = 1e6; clearInterval(window.__hold); const px = g.P.x, py = g.P.y; window.__pin = [px, py];
  window.__hold = setInterval(() => { __game.P.hp = 1e6; if (window.__pin) { __game.P.x = window.__pin[0]; __game.P.y = window.__pin[1]; } }, 30);
  g.projectiles().length = 0; g.v26a.reset(); g.v26a.set('coin', true); g.v26a.set('blast', true);
  g.P.weapon = 0; g.WS.state = 'idle'; g.WS.cd = 0; g.P.a = 0; g.P.pitch = 0; g.setMouse(false, false);
  if (o.card) g.gainCard(Cards.byId('skarpskyttens_mynt'));
};
const scene = o => pg.evaluate(sceneFn, o);
const gt = () => ev(() => __game.roles.t());
const until = async (cond, sec, arg) => { const t0 = await gt(), w0 = Date.now(); for (;;) { if (cond && await ev(cond, arg)) return true; if ((await gt()) - t0 >= sec || Date.now() - w0 > 120000) return !cond; await wait(50); } };
const gwait = sec => until(null, sec);
const shoot = () => ev(() => { const g = __game; g.P.weapon = 0; g.WS.state = 'idle'; g.WS.cd = 0; g.WS.aim = 0; g.P.mags[0] = 9; g.P.burst = 0; g.P.a = 0; g.P.pitch = 0; g.fire(); });
const rclick = async () => { await ev(() => { __game.P.a = 0; __game.setMouse(false, true); }); await gwait(0.06); await ev(() => __game.setMouse(false, false)); };
const st = () => ev(() => { const s = __game.v26a.st(); return { ...s, log: undefined }; });
const hp = () => ev(() => __game.ents().filter(e => !e.dead).map(e => +(500 - e.hp).toFixed(2)));
const BASE = { W: 24, H: 14, p: [3, 6], en: [['S', 9, 10]] }; // fienden 4 rutor från siktlinjen: bara myntet kan nå den

// 1) utan kortet: högerklick siktar som förut och inget mynt
await scene({ ...BASE, card: false }); await gwait(0.4);
await ev(() => __game.setMouse(false, true)); await gwait(0.4);
const a1 = await ev(() => ({ aim: +__game.WS.aim.toFixed(2), live: __game.v26a.state().live, card: __game.v26a.state().card }));
await ev(() => __game.setMouse(false, false));
ok(!a1.card && a1.aim > 0.8 && a1.live === 0, `utan kortet siktar högerklicket och inget mynt kastas ${JSON.stringify(a1)}`);

// 2) med kortet: ett högerklick = ett mynt, siktet går inte in
await scene({ ...BASE, card: true }); await gwait(0.4);
const s0 = await ev(() => __game.v26a.state());
await ev(() => __game.setMouse(false, true)); await gwait(0.3);
const a2 = await ev(() => ({ aim: +__game.WS.aim.toFixed(2), ...__game.v26a.state() }));
await ev(() => __game.setMouse(false, false));
ok(s0.card && s0.coins === 4 && a2.coins === 3 && a2.live === 1 && a2.aim === 0, `med kortet: ett mynt kastat (4 → ${a2.coins}), siktet går inte in ${JSON.stringify(a2)}`);

// 3) mynt i luften + skott: kulan studsar till fiendens huvud utanför hårkorset
await scene({ ...BASE, card: true }); await gwait(0.4);
await rclick(); await gwait(0.25);
const c3 = await ev(() => __game.v26a.coins());
await shoot();
const s3 = await st(), h3 = await hp();
const pistol = await ev(() => __game.WEAPONS[0].dmg);
ok(c3.length === 1 && s3.coinHits === 1 && s3.heads === 1 && s3.maxChain === 1, `skottet träffade myntet (${JSON.stringify(c3)}) och studsade till huvudet ${JSON.stringify(s3)}`);
ok(h3[0] >= pistol * 2 - 1e-6 && Math.abs(h3[0] - s3.coinDmg) < 0.01, `fienden utanför hårkorset tog ${h3[0]} skada (pistolen gör ${pistol}, minst 2×)`);
ok(await ev(() => __game.styleRef().feed.some(f => f.t === '+MYNT')), 'stilmätaren visar +MYNT');
await ev(() => __game.v26a.coins().length === 0) ? ok(true, 'myntet är förbrukat efter träffen') : ok(false, 'myntet finns kvar efter träffen');

// 4) kedja: två mynt i luften, skottet tar det närmaste som studsar till det andra och sedan till huvudet
await scene({ ...BASE, card: true }); await gwait(0.4);
await rclick(); await gwait(0.12); await rclick(); await gwait(0.15);
const c4 = await ev(() => __game.v26a.coins().length);
await shoot();
const s4 = await st(), h4 = await hp();
ok(c4 === 2 && s4.coinHits === 2 && s4.maxChain === 2 && s4.chains === 1 && s4.heads === 1, `kedja med två mynt ${JSON.stringify(s4)}`);
ok(h4[0] > h3[0] * 1.3, `kedjan gör mer skada: ${h4[0]} mot ${h3[0]} med ett mynt`);
ok(await ev(() => __game.styleRef().feed.some(f => f.t === '+KEDJA ×2')), 'stilmätaren visar +KEDJA ×2');

// 5) prioritet: en egen granat vid sidan av går före fienden – sprängskott via myntet
await scene({ ...BASE, card: true }); await gwait(0.4);
await ev(() => { const p = { x: 7.5, y: 3.0, z: 0.05, vz: 0, vx: 0, vy: 0, kind: 'pgren', friendly: true, life: 2.5, dmg: 38, beepT: 0 }; __game.projectiles().push(p); window.__n = p; });
await rclick(); await gwait(0.25);
await shoot();
const s5 = await st();
ok(s5.coinHits === 1 && s5.blasts === 1 && s5.nade === 1 && s5.heads === 0, `myntet valde granaten före fienden ${JSON.stringify(s5)}`);
await until(() => window.__n.dead, 1);

// 6) ett mynt på golvet går inte att träffa
await scene({ ...BASE, card: true }); await gwait(0.4);
await rclick();
await until(() => __game.v26a.coins().length === 0, 3);
await shoot();
const s6 = await st(), h6 = await hp();
ok(s6.throws === 1 && s6.coinHits === 0 && h6[0] === 0, `myntet på golvet träffas inte ${JSON.stringify(s6)}`);

// 7) högst 4 mynt; ett nytt efter 4 s speltid
await scene({ ...BASE, card: true }); await gwait(0.4);
for (let i = 0; i < 5; i++) { await rclick(); await gwait(0.08); }
const a7 = await ev(() => __game.v26a.state());
await gwait(4.3);
const b7 = await ev(() => __game.v26a.state());
ok(a7.coins === 0 && (await st()).throws === 4, `fem tryck ger fyra mynt ${JSON.stringify(a7)}`);
ok(b7.coins === 1, `ett nytt mynt efter 4 s ${JSON.stringify(b7)}`);

// 8) VÄXLA SIKTE (samma väg som ALT på pekskärm): två tryck utan att släppa ger två mynt
await scene({ ...BASE, card: true, toggle: true }); await gwait(0.4);
await ev(() => __game.setMouse(false, true)); await gwait(0.1);
await ev(() => __game.setMouse(false, true)); await gwait(0.1);
const a8 = await ev(() => ({ ...__game.v26a.state(), throws: __game.v26a.st().throws }));
ok(a8.throws === 2, `växla sikte: två tryck = två mynt ${JSON.stringify(a8)}`);

// 9) av: högerklick siktar igen och inget mynt
await scene({ ...BASE, card: true }); await gwait(0.4); await ev(() => __game.v26a.set('coin', false));
await ev(() => __game.setMouse(false, true)); await gwait(0.4);
const a9 = await ev(() => ({ aim: +__game.WS.aim.toFixed(2), live: __game.v26a.state().live }));
await ev(() => { __game.setMouse(false, false); __game.v26a.set('coin', true); });
ok(a9.aim > 0.8 && a9.live === 0, `av: högerklick siktar och kastar inget ${JSON.stringify(a9)}`);
await pg.locator('#screen').screenshot({ path: 'out/t121/myntet.png' }).catch(() => {});

// 10) med effekterna på (inte lowfx): mynt med guldsken, träff med spårljus – inga ritfel
await scene({ ...BASE, card: true }); await ev(() => { __game.settings.lowfx = false; }); await gwait(0.4);
await rclick(); await gwait(0.25);
const fail10 = await ev(() => __game.projectiles().filter(p => p.kind === 'coin').map(p => p.renderFail || 0));
await shoot(); await gwait(0.3);
const s10 = await st();
ok(s10.coinHits === 1 && fail10.every(f => f === 0) && cerr.length === 0, `utan lowfx: myntet ritas och träffas utan fel (renderFail ${fail10}, konsolfel ${JSON.stringify(cerr)})`);
await pg.locator('#screen').screenshot({ path: 'out/t121/myntet_fx.png' }).catch(() => {});

await done();
