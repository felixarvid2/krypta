// t132: version 26C – hån (förslag 12). Y väcker fienderna inom 10 rutor (inte längre bort, inte bossar eller slumrande mimicer),
// ger de närmaste en tvingad anfallspolett (SMART FIENDE-AI) och säger något. Ett nytt tryck inom 8 s nekas. Ett dödande inom 4 s
// ger +HÅNAD och mer stil än samma dödande utan hån. Tangenten går att byta (ACTIONS har HÅNA), handkontrollen har en valfri
// knapp och pekskärmen en klockknapp som bara syns med ALLA KNAPPAR. Inga sidfel. Väntetider i speltid (__game.v26c.t()).
import { setup } from './head.mjs';
const PORT = 9832;
const { pg, ev, wait, ok, done } = await setup(PORT, 'out/t132');
await pg.goto(`http://localhost:${PORT}/index.html?nolock=1`); await pg.waitForFunction('!document.getElementById("start").disabled', { timeout: 90000 });
const btn = await ev(() => { const b = document.querySelector('#touch .tauntb'); return b ? { act: b.dataset.act, xtra: b.classList.contains('xtra'), tb: b.classList.contains('tb') } : null; });
ok(btn && btn.act === 'taunt' && btn.xtra && btn.tb, 'pekskärmen: klockknappen finns och hör till ALLA KNAPPAR (xtra) ' + JSON.stringify(btn));

const sceneFn = o => { const g = __game; g.profile.tutDone = true; g.settings.autoLowFx = false; g.settings.lowfx = true;
  const W = o.W, H = o.H, grid = []; for (let y = 0; y < H; y++) { const r = []; for (let x = 0; x < W; x++) r.push(x === 0 || y === 0 || x === W - 1 || y === H - 1 ? '1' : '.'); grid.push(r); }
  grid[o.p[1]][o.p[0]] = 'P'; grid[1][W - 2] = 'x';
  for (const [t, x, y] of o.en) grid[y][x] = t;
  g.playCustom({ grid, biome: 'dungeon' });
  const E = g.ents(), spec = E.filter(e => !e.boss).map(e => [e.type, e.x, e.y]); E.length = 0;
  for (const [t, x, y] of spec) g.spawnEnemy(t, x, y);
  for (const e of E) { e.d = { ...e.d, dmg: 0, speed: 0 }; e.alert = false; }
  g.P.hp = 1e6; clearInterval(window.__hold); window.__pin = [g.P.x, g.P.y];
  window.__hold = setInterval(() => { __game.P.hp = 1e6; __game.P.x = window.__pin[0]; __game.P.y = window.__pin[1]; }, 30);
};
const scene = o => pg.evaluate(sceneFn, o);
const gt = () => ev(() => __game.v26c.t());
const until = async (cond, sec, arg) => { const t0 = await gt(), w0 = Date.now(); for (;;) { if (cond && await ev(cond, arg)) return true; if ((await gt()) - t0 >= sec || Date.now() - w0 > 120000) return !cond; await wait(80); } };
const gwait = sec => until(null, sec);

// 1) Y: de tre nära vaknar, den långt bort (14 rutor) sover vidare
await scene({ W: 30, H: 15, p: [3, 7], en: [['S', 8, 7], ['S', 9, 5], ['K', 10, 9], ['S', 17, 7]] });
await gwait(0.6);
const f0 = await ev(() => ({ forced: __game.ai.st().forced, alert: __game.ents().filter(e => e.alert).length, msgs: __game.msgs().length }));
await pg.keyboard.press('KeyY'); await gwait(0.1);
const t1 = await ev(() => { const g = __game; return { taunts: g.v26c.st.taunts, taunted: g.v26c.st.taunted, forced: g.ai.st().forced,
  alert: g.ents().filter(e => !e.dead).map(e => [e.type, Math.round(Math.hypot(e.x - g.P.x, e.y - g.P.y)), !!e.alert]), says: g.msgs().map(m => m.text) }; });
ok(t1.taunts === 1 && t1.taunted === 3 && t1.alert.filter(a => a[1] <= 10).every(a => a[2]) && t1.alert.filter(a => a[1] > 10).every(a => !a[2]), 'Y väcker de tre inom 10 rutor men inte den på 14 rutor ' + JSON.stringify(t1.alert));
ok(t1.forced - f0.forced >= 1, `de närmaste får tvingade anfallspoletter (${f0.forced} -> ${t1.forced})`);
ok(JSON.stringify(t1.says).includes('KOM HIT!'), 'hånet syns som text ' + JSON.stringify(t1.says));

// 2) ett nytt tryck inom 8 s nekas
await pg.keyboard.press('KeyY'); await gwait(0.1);
const t2 = await ev(() => ({ taunts: __game.v26c.st.taunts, deny: __game.v26c.st.tauntDeny }));
ok(t2.taunts === 1 && t2.deny === 1, 'ett andra tryck inom 8 s nekas ' + JSON.stringify(t2));

// 3) ett dödande inom 4 s ger +HÅNAD och mer stil; ett dödande efter fönstret gör det inte
const killOne = () => ev(() => { const g = __game, s = g.styleRef(), e = g.ents().find(x => !x.dead && x.type === 'S' && x.alert); if (!e) return null;
  s.v = 0; const k0 = g.v26c.st.tauntKills; e.alert = true; g.hurtEnemy(e, e.hp + 1, e.x, e.y); return { v: +s.v.toFixed(1), kills: g.v26c.st.tauntKills - k0, feed: s.feed.map(f => f.t) }; });
const k1 = await killOne();
ok(k1 && k1.kills === 1 && k1.feed.includes('+HÅNAD'), 'ett dödande inom 4 s: +HÅNAD ' + JSON.stringify(k1));
await gwait(4.2);
const k2 = await killOne();
ok(k2 && k2.kills === 0 && !k2.feed.includes('+HÅNAD') && k1.v > k2.v, 'efter 4 s: inget +HÅNAD och mindre stil för samma sorts dödande ' + JSON.stringify({ k1: k1.v, k2: k2.v, feed: k2.feed }));

// 4) efter 8 s går det igen
await gwait(4.2);
await pg.keyboard.press('KeyY'); await gwait(0.1);
const t3 = await ev(() => __game.v26c.st.taunts);
ok(t3 === 2, 'efter 8 s går det att håna igen ' + t3);

// 5) bossar och slumrande mimicer berörs inte; tangenten går att byta
await scene({ W: 30, H: 15, p: [3, 7], en: [['Q', 6, 7], ['S', 7, 9]] });
await gwait(8.3);
const m1 = await ev(() => { const q = __game.ents().find(e => e.type === 'Q'); if (q) { q.dormant = true; q.alert = false; } return { was: !!(q && q.dormant) }; }); // som en mimic som väntar
await pg.keyboard.press('KeyY'); await gwait(0.1);
const m2 = await ev(() => { const g = __game, q = g.ents().find(e => e.type === 'Q'), s = g.ents().find(e => e.type === 'S'); return { mimicDormant: q ? !!q.dormant : null, mimicAlert: q ? !!q.alert : null, sAlert: !!s.alert, taunted: g.v26c.st.taunted }; });
ok(m1.was && m2.sAlert && m2.mimicDormant && !m2.mimicAlert && m2.taunted === 1, 'den slumrande mimicen avslöjas inte av hånet ' + JSON.stringify({ m1, m2 }));
const kb = await ev(() => __game.v26c.binds());
ok(kb.key && kb.padAct && kb.pad === -1, 'HÅNA finns i tangentbytet (Y) och bland handkontrollens handlingar (ingen knapp som standard) ' + JSON.stringify(kb));
await ev(() => { __game.settings.binds = Object.assign({}, __game.settings.binds, { KeyY: 'KeyU' }); });
await gwait(8.3); const b0 = await ev(() => __game.v26c.st.taunts);
await pg.keyboard.press('KeyU'); await gwait(0.1);
const b1 = await ev(() => __game.v26c.st.taunts);
await ev(() => { const b = Object.assign({}, __game.settings.binds); delete b.KeyY; __game.settings.binds = b; });
ok(b1 === b0 + 1, 'HÅNA flyttad till U: U hånar ' + JSON.stringify([b0, b1]));
await ev(() => clearInterval(window.__hold));
await done();
