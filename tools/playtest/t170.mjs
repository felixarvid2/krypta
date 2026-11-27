// t170: version 29 (SPEL), balkongskyttarna och vakttornets skytt stannar på sin plats. Skyttarna som version 28 flyttar upp på balkongen bakom
// gallret (och in i vakttornet) ska hålla sig till avsatsen även när de jagar spelaren: de får gå på balkongens/tornets egna rutor (scenens ruta i
// level.scenes28, där även ingången ingår) men aldrig ut i salen. Spelaren står i salen, skyttarna är larmade och har mycket hälsa (deras fart och
// skada är orörda), och vi väntar i speltid. Om spelaren själv går upp på balkongen får skytten följa efter där. Kontrollen: samma sak med
// __game.s29.set('tether', false) ska låta dem gå ut (visar att testet kan falla). Alla väntetider i speltid. Inga sidfel.
import { setup } from './head.mjs';
const PORT = 9870, OUT = process.env.S29_OUT || 'out/t170';
const { ev, wait, ok, start, done } = await setup(PORT, OUT);
await start();
const gt = () => ev(() => __game.roles.t());
const until = async (cond, sec, arg) => { const t0 = await gt(), w0 = Date.now(); for (;;) { if (cond && await ev(cond, arg)) return true; if ((await gt()) - t0 >= sec || Date.now() - w0 > 180000) return !cond; await wait(60); } };
const gwait = sec => until(null, sec);
const find = (kind, biomes, depth) => ev(([kind, biomes, depth]) => { for (let i = 0; i < 300; i++) { const b = biomes[i % biomes.length], o = { biome: b, v28: { scenes: [kind], blood: false } }, seed = 't170-' + kind + i, L = Gen.floor(seed, depth, o);
  const s = (L.scenes28 || []).find(q => q.kind === kind); if (!s) continue;
  let foes = 0; for (let y = s.y; y < s.y + s.h; y++) for (let x = s.x; x < s.x + s.w; x++) if ('SKVILNORWE'.includes(L.map[y][x])) foes++;
  if (foes) return [seed, o, s]; } return null; }, [kind, biomes, depth]);
const load = (seed, depth, opts) => ev(([s, d, o]) => { const g = __game; g.run().depth = d; const L = Gen.floor(s, d, o); g.startLevel(L); g.resume && g.resume(); return true; }, [seed, depth, opts]);
// skyttarna i scenens ruta: larmade, mycket hälsa; spelaren i salen (samma rum, utanför rutan, minst 3 rutor bort, fri sikt saknas inte nödvändigtvis)
const stage = s => ev(s => { const g = __game, L = g.lvl(), m = g.mapRef(), inBox = (x, y) => x >= s.x && x < s.x + s.w && y >= s.y && y < s.y + s.h;
  const mine = g.ents().filter(e => !e.dead && !e.boss && inBox(e.x | 0, e.y | 0));
  for (const e of mine) { e.hp = e.maxHp = 50000; e.alert = true; e.sleep = false; e.asleep = false; e.t170 = true; }
  let best = null, bd = -1; const cx = s.x + s.w / 2, cy = s.y + s.h / 2;
  for (let y = 0; y < m.length; y++) for (let x = 0; x < m[0].length; x++) { if (L.roomMask[y][x] === '-' || L.roomMask[y].charCodeAt(x) - 48 !== s.room || inBox(x, y) || g.solid(x + 0.5, y + 0.5) || m[y][x] !== '.') continue;
    const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy); if (d >= 3 && d <= 7 && d > bd) { bd = d; best = [x, y]; } }
  if (best) { g.P.x = best[0] + 0.5; g.P.y = best[1] + 0.5; g.P.a = Math.atan2(cy - g.P.y, cx - g.P.x); }
  window.__hold = setInterval(() => { const P = __game.P; P.hp = 99999; P.armor = 200; }, 100);
  return { n: mine.length, at: best }; }, s);
const sample = s => ev(s => { const inBox = (x, y) => x >= s.x && x < s.x + s.w && y >= s.y && y < s.y + s.h; const out = []; for (const e of __game.ents()) if (e.t170 && !e.dead) { if (!inBox(e.x | 0, e.y | 0)) out.push([+e.x.toFixed(2), +e.y.toFixed(2)]); } return out; }, s);
const watch = async (s, sec) => { let worst = []; const t0 = await gt(); while ((await gt()) - t0 < sec) { const o = await sample(s); if (o.length > worst.length) worst = o; await gwait(0.5); } return worst; };
const SCENES = [['balcony', ['frost', 'courtyard', 'dungeon', 'lab', 'library', 'prison'], 3], ['tower', ['dungeon', 'frost', 'courtyard', 'prison', 'crystal', 'cathedral'], 3]];
for (const [kind, biomes, d] of SCENES) {
  const f = await find(kind, biomes, d); if (!f) { ok(false, kind + ': ingen bana med skyttar hittades'); continue; }
  const [seed, opts, s] = f;
  // med fastsättningen (standard)
  await load(seed, d, opts); await gwait(0.3);
  const st = await stage(s);
  ok(st.n > 0 && st.at, `${kind}: ${st.n} skytt(ar) i scenens ruta ${JSON.stringify(s)}, spelaren i salen vid ${st.at}`);
  const worst = await watch(s, 14);
  ok(worst.length === 0, `${kind}: skyttarna stannar på ${kind === 'tower' ? 'tornet' : 'balkongen'} i 14 s speltid medan de jagar (${worst.length ? 'ute: ' + JSON.stringify(worst) : 'ingen ute'})`);
  const alive = await ev(() => __game.ents().filter(e => e.t170 && !e.dead).map(e => ({ st: e.state, alert: !!e.alert })));
  ok(alive.length > 0 && alive.every(a => a.alert), `${kind}: skyttarna är vakna och larmade ${JSON.stringify(alive)}`);
  await ev(() => clearInterval(window.__hold));
  // kontroll: utan fastsättningen går de ut (om de alls vill) – visar att mätningen kan falla
  if (kind === 'balcony') {
    const has = await ev(() => !!(__game.s29 && __game.s29.set));
    if (has) { await ev(() => __game.s29.set('tether', false)); await load(seed, d, opts); await gwait(0.3); await stage(s); const w2 = await watch(s, 14); await ev(() => { clearInterval(window.__hold); __game.s29.set('tether', true); });
      console.log('INFO', `${kind} utan fastsättning: ${w2.length} skytt(ar) utanför rutan ${JSON.stringify(w2)}`); }
  }
}
await done();
