// t131: version 26C – stilrangen styr musiken. Med samma fiender är musikens intensitet (Music.intensity) högre på rang S än på
// rang D (tillskott 0,15 per rang över B, klämt till 0–1, även i bossgrenen). En ny rang A–SSS ger en kort syntad stinger
// (Music.rankSting), högst en per 4 s speltid. STILMÄTARE av eller MUSIKEN FÖLJER STILEN av: inget tillskott och ingen stinger.
// Utan ljud (inget AudioContext ännu) räknas rangen och tillskottet ändå. Inga sidfel. Väntetider i speltid (__game.v26c.t()).
import { setup } from './head.mjs';
const PORT = 9831;
const { pg, ev, wait, ok, done } = await setup(PORT, 'out/t131');
await pg.goto(`http://localhost:${PORT}/index.html?nolock=1`); await pg.waitForFunction('!document.getElementById("start").disabled', { timeout: 90000 });
ok(await ev(() => !!__game.v26c && __game.settings.styleMusic === true && typeof Music.rankSting === 'function'), '__game.v26c och Music.rankSting finns; MUSIKEN FÖLJER STILEN är på som standard');

const sceneFn = o => { const g = __game; g.profile.tutDone = true; g.settings.autoLowFx = false; g.settings.lowfx = true;
  const W = o.W, H = o.H, grid = []; for (let y = 0; y < H; y++) { const r = []; for (let x = 0; x < W; x++) r.push(x === 0 || y === 0 || x === W - 1 || y === H - 1 ? '1' : '.'); grid.push(r); }
  grid[o.p[1]][o.p[0]] = 'P'; grid[1][W - 2] = 'x';
  for (const [t, x, y] of o.en) grid[y][x] = t;
  g.playCustom({ grid, biome: 'dungeon' });
  const E = g.ents(), spec = E.filter(e => !e.boss).map(e => [e.type, e.x, e.y]); E.length = 0;
  for (const [t, x, y] of spec) g.spawnEnemy(t, x, y);
  for (const e of E) { e.d = { ...e.d, dmg: 0, speed: 0, range: 0.1 }; e.alert = true; e.lostT = 0; e.lx = g.P.x; e.ly = g.P.y; }
  g.P.hp = 1e6; clearInterval(window.__hold); window.__pin = [g.P.x, g.P.y]; window.__sv = 0;
  window.__hold = setInterval(() => { const g = __game; g.P.hp = 1e6; g.P.x = window.__pin[0]; g.P.y = window.__pin[1]; for (const e of g.ents()) { e.alert = true; e.lostT = 0; } if (window.__sv !== null) g.styleRef().v = window.__sv; }, 30);
};
const scene = o => pg.evaluate(sceneFn, o);
const gt = () => ev(() => __game.v26c.t());
const until = async (cond, sec, arg) => { const t0 = await gt(), w0 = Date.now(); for (;;) { if (cond && await ev(cond, arg)) return true; if ((await gt()) - t0 >= sec || Date.now() - w0 > 120000) return !cond; await wait(80); } };
const gwait = sec => until(null, sec);
const st = () => ev(() => __game.v26c.state());
const setV = v => ev(v => { window.__sv = v; __game.styleRef().v = v; }, v);
const SC = { W: 26, H: 15, p: [4, 7], en: [['S', 9, 5], ['S', 9, 9]] };

// 1) utan ljud: rangen och tillskottet räknas ändå (rangspårningen ligger före ljudkollen)
await scene(SC); await ev(() => { window.__M = window.Music; window.Music = undefined; }); // som utan ljud: updateAudioMood går ut direkt
await setV(0); await gwait(0.5);
const a0 = await st();
await setV(115); await gwait(0.3);
const a1 = await st();
await ev(() => { window.Music = window.__M; });
ok(!a0.music && a0.bonus === 0 && a1.rank === 4 && Math.abs(a1.bonus - 0.3) < 1e-9, 'utan ljud: rang D ger inget tillskott, rang S ger 0,3 ' + JSON.stringify({ d: [a0.rank, a0.bonus], s: [a1.rank, a1.bonus], music: a0.music }));

// 2) med ljud (inställningsknappen startar ljudet som en riktig användare): samma fiender, rang D och sedan rang S
await ev(() => clearInterval(window.__hold));
await pg.goto(`http://localhost:${PORT}/index.html?nolock=1`); await pg.waitForFunction('!document.getElementById("start").disabled', { timeout: 90000 });
await pg.click('#settingsbtn').catch(() => {}); await wait(300); await pg.keyboard.press('Escape'); await wait(300);
await pg.waitForFunction('window.Music && Music.sfxIn', { timeout: 30000 }).catch(() => {});
await scene(SC); await setV(0); await gwait(4);
const d = await st();
await setV(115); await gwait(4);
const s = await st();
ok(d.music && s.music, 'ljudet är igång (Music.sfxIn) ' + JSON.stringify({ d: d.music, s: s.music }));
ok(s.musicI > d.musicI + 0.15 && s.want > d.want + 0.25, `samma fiender: musiken är intensivare på rang S än på rang D (Music.intensity ${d.musicI.toFixed(3)} -> ${s.musicI.toFixed(3)}, mål ${d.want.toFixed(2)} -> ${s.want.toFixed(2)})`);
ok(s.stings === d.stings + 1 && s.lastSting === 4, 'rangen D -> S ger en stinger ' + JSON.stringify({ before: d.stings, after: s.stings, last: s.lastSting }));

// 3) högst en stinger per 4 s: SS direkt efter ger ingen, SSS efter 4 s ger en
await setV(0); await gwait(0.3);
const c0 = await st(); await setV(115); await gwait(0.3);
const c1 = await st(); await setV(160); await gwait(0.5);
const c2 = await st(); await gwait(4); await setV(205); await gwait(0.3);
const c3 = await st();
ok(c2.rank === 5 && c2.stings === c1.stings && c3.rank === 6 && c3.stings === c2.stings + 1 && c3.lastSting === 6, 'stingern har 4 s nedkylning (SS strax efter S tyst, SSS efter 4 s spelas) ' + JSON.stringify([c0.stings, c1.stings, c2.stings, c3.stings, c3.lastSting]));
ok(c3.want <= 1 && c3.want >= 0, 'målet är klämt till 0–1 ' + c3.want);
ok(c3.rankFx > c0.rankFx, 'stilmätaren ritar en ram som växer ut från bokstaven vid ny rang ' + JSON.stringify([c0.rankFx, c3.rankFx]));
const rs = await ev(() => [0, 1, 2, 3, 9, -2].map(l => Music.rankSting(l)));
ok(rs.every(x => x === true), 'Music.rankSting spelar alla fyra nivåerna (och klämmer konstiga värden) ' + JSON.stringify(rs));

// 4) STILMÄTARE av och MUSIKEN FÖLJER STILEN av: inget tillskott, ingen stinger
for (const [k, label] of [['styleMeter', 'STILMÄTARE'], ['styleMusic', 'MUSIKEN FÖLJER STILEN']]) {
  await setV(0); await gwait(4.2);
  await ev(k => { __game.settings[k] = false; }, k);
  const o0 = await st(); await setV(115); await gwait(0.5);
  const o1 = await st();
  await ev(k => { __game.settings[k] = true; }, k);
  ok(o1.bonus === 0 && o1.stings === o0.stings && o1.rank === 4, `${label} av: inget tillskott och ingen stinger ` + JSON.stringify({ bonus: o1.bonus, st: [o0.stings, o1.stings] }));
}
await ev(() => { clearInterval(window.__hold); });
await done();
