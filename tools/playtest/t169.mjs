// t169: version 29 (FÖNSTER) – glas och rostiga galler på en riktig våning (Gen.floor 133, djup 3, med vakttorn och balkong).
// Tvingat glas: vakttornets fönster är glas. Spelaren står öster om tornet: man ser in, kulan går inte igenom förrän glaset är krossat,
// sedan går fiendernas avståndsfält till tornets inre genom öppningen (kortare än via ingången), och skärvorna ligger på golvet.
// Tvingat rost: tornet får ett rostigt galler; en smäll intill böjer upp det. Skärmbilder för README. Väntan i speltid. Port 9869.
import { setup } from './head.mjs';
const PORT = 9869;
const { pg, ev, wait, ok, shot, start, done } = await setup(PORT, 'out/t169');
const cerr = []; pg.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) cerr.push(m.text().slice(0, 160)); }); // (spelets slinga fångar fel: de syns bara i konsolen)
await start();
const gt = () => ev(() => __game.v27b.t());
const until = async (cond, sec) => { const t0 = await gt(), w0 = Date.now(); for (;;) { if (cond && await ev(cond)) return true; if ((await gt()) - t0 >= sec || Date.now() - w0 > 120000) return !cond; await wait(80); } };
const gwait = sec => until(null, sec);
const load = force => ev(force => { const g = __game; Object.assign(g.settings, { autoLowFx: false, lowfx: false }); if (g.f29) g.f29.F29.force = force;
  const L = Gen.floor(133, 3, { v28: { scenes: ['tower', 'balcony'] } }), R = g.run(); R.depth = 3; R.seed = 133; R.custom = false; R.practice = false; g.startLevel(L); g.f29.F29.force = null;
  for (const e of g.ents()) { e.d = { ...e.d, speed: 0, dmg: 0 }; e.alert = false; e.sleep = true; }
  return { tower: (L.scenes28 || []).find(s => s.kind === 'tower'), cells: g.f29.cells() }; }, force);
const pin = (x, y, a) => ev(([x, y, a]) => { window.__pin = [x, y, a]; clearInterval(window.__hold); window.__hold = setInterval(() => { const P = __game.P; P.hp = 1e6; P.x = window.__pin[0]; P.y = window.__pin[1]; P.a = window.__pin[2]; P.vx = P.vy = 0; P.look = 0; P.pitch = 0; }, 30); }, [x, y, a]);
const r = await load('glass');
ok(r.tower && r.cells.length >= 4 && r.cells.every(c => c.kind === 'glass'), 'vakttornets fönster är glas ' + JSON.stringify({ tower: r.tower, n: r.cells.length }));
const t = r.tower, east = r.cells.filter(c => c.x === t.x + t.w - 1).sort((a, b) => a.y - b.y)[0];
ok(!!east, 'ett glas på tornets östra sida ' + JSON.stringify(east));
await pin(east.x + 3.5, east.y + 0.5, Math.PI); await until(() => __game.banner() <= 0, 5); await gwait(0.6);
await shot('torn_glas');
const fl = () => ev(([x, y]) => { const g = __game; g.f29.updateFlow(); const m = g.f29.map(); return g.f29.flow()[y * m[0].length + x]; }, [east.x - 1, east.y]);
const f0 = await fl();
await ev(async () => { const g = __game, P = g.P, WS = g.WS, i = g.WEAPONS.findIndex(w => w.id === 'pistol'); P.has[i] = true; P.weapon = i; if (P.ammo) for (const k in P.ammo) P.ammo[k] = 99;
  for (let k = 0; k < 3; k++) { P.mags[i] = 9; WS.state = 'idle'; WS.cd = 0; WS.t = 0; WS.shot = 99; g.fire(); await new Promise(r => setTimeout(r, 150)); } });
await gwait(0.8); await shot('torn_krossat');
const c1 = await ev(([x, y]) => __game.f29.cells().find(c => c.x === x && c.y === y), [east.x, east.y]), f1 = await fl();
ok(c1.open && c1.ch === 'ǀ', 'tre skott krossar tornets glas ' + JSON.stringify(c1));
ok(f1 >= 0 && (f0 < 0 || f1 < f0), 'vägsökningen in i tornet går genom öppningen ' + JSON.stringify({ före: f0, efter: f1 }));
const dec = await ev(() => __game.f29.L().broken);
ok(dec === 1, 'ett glas krossat ' + dec);
// rostigt galler i tornet, en smäll böjer upp det
const r2 = await load('rust');
const rc = r2.cells.find(c => c.kind === 'rust');
ok(!!rc, 'tvingat rost: tornet får ett rostigt galler ' + JSON.stringify(r2.cells));
if (rc) { const inside = rc.x > t.x && rc.x < t.x + t.w - 1 ? 0 : 1, dx = rc.x === t.x ? -1 : rc.x === t.x + t.w - 1 ? 1 : 0, dy = rc.y === t.y ? -1 : rc.y === t.y + t.h - 1 ? 1 : 0;
  let k = 0; while (k < 3 && await ev(([x, y]) => !__game.v28.solid(x, y), [rc.x + 0.5 + dx * (k + 1), rc.y + 0.5 + dy * (k + 1)])) k++; k = Math.max(1, k); // (så långt ut som det går utan vägg emellan, högst 3 rutor)
  await pin(rc.x + 0.5 + dx * (k - 0.2), rc.y + 0.5 + dy * (k - 0.2), Math.atan2(-dy, -dx)); await gwait(0.6); await shot('torn_rost');
  await ev(([x, y]) => __game.explode(x, y, 5, 1.6, false), [rc.x + 0.5 + dx * 1.2, rc.y + 0.5 + dy * 1.2]); await gwait(1.2); await shot('torn_rost_uppbojt');
  const c2 = await ev(([x, y]) => __game.f29.cells().find(c => c.x === x && c.y === y), [rc.x, rc.y]);
  ok(c2.open && c2.ch === 'ʭ', 'en smäll böjer upp tornets rostiga galler ' + JSON.stringify(c2)); }
await ev(() => { clearInterval(window.__hold); });
ok(cerr.length === 0, 'inga fel i konsolen ' + [...new Set(cerr)].slice(0, 3).join(' / '));
await done();
