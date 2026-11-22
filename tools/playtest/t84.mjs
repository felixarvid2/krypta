// v15/v16: genererade banor i katedralen, bikupan, trädgården och drömriket i spelet – fiender, rekvisita, föremål, glidande väggar, arenor, bossar
import { setup } from './head.mjs';
const PORT = 8900 + Math.floor(Math.random() * 90);
const { pg, shot, ev, wait, ok, done } = await setup(PORT, 'out/t84');
await pg.goto(`http://localhost:${PORT}/index.html?nolock=1&god=1`); await pg.waitForFunction('!document.getElementById("start").disabled', { timeout: 90000 });
await ev(() => { __game.profile.tutDone = true; __game.begin('new'); }); await wait(1500);
ok(await ev(() => ['cathedral', 'hive', 'garden', 'dream'].every(a => Gen.ARENAS.includes(a))), 'Gen.ARENAS har de nya arenorna (bossPool tar med bossarna)');
const NEWEN = 'ƑƒƜƘƙƚƫƬƭƮƯư', NEWPR = 'ƎƏƐƗƧƨƩƪ';
for (const biome of ['cathedral', 'hive', 'garden', 'dream']) {
  const seen = { en: {}, pr: {}, items: {} }; let unknown = 0, levels = 0;
  for (const [s, d, gu] of [[11, 1, 'cardinal'], [12, 3, 'queenbee'], [13, 5, 'gardener'], [14, 4, 'sandman'], [15, 2, 'demon']]) {
    const r = await ev(([biome, s, d, gu]) => {
      const g = __game, L = Gen.floor(s * 7919 + d, d, { biome, guardian: gu, weapon: { cathedral: 'censer', hive: 'hivelauncher', garden: 'shears', dream: 'dreamstaff' }[biome] });
      g.run().depth = d; g.startLevel(L);
      const m = g.mapRef(), left = new Set();
      for (const row of m) for (const c of row) left.add(c);
      return { en: g.ents().map(e => e.type || e.ch || (e.d && e.d.name)), types: g.ents().map(e => e.type), pr: g.props().map(p => p.ch).filter(Boolean), items: g.items().map(i => i.type), guardian: !!g.ents().find(e => e.guardian),
        left: [...left].join(''), shifts: (L.shifts || []).length, ammo: Object.keys(g.P.ammo || {}) };
    }, [biome, s, d, gu]);
    levels++;
    for (const t of r.types) if (t) seen.en[t] = (seen.en[t] || 0) + 1;
    for (const c of r.pr) seen.pr[c] = (seen.pr[c] || 0) + 1;
    for (const t of r.items) seen.items[t] = (seen.items[t] || 0) + 1;
    if (!r.guardian) ok(false, `${biome} d${d}: väktaren saknas`);
    await wait(500);
  }
  const en = Object.keys(seen.en).join(''), pr = Object.keys(seen.pr).join('');
  ok([...NEWEN].some(c => en.includes(c)), `${biome}: nya fiender i spelet ${JSON.stringify(seen.en)}`);
  ok([...NEWPR].some(c => pr.includes(c)) || biome === 'hive' && pr.includes('Ɨ'), `${biome}: nya rekvisita i spelet ${JSON.stringify(seen.pr)}`);
  ok(Object.keys(seen.items).some(t => ['censer', 'hivelauncher', 'shears', 'dreamstaff'].includes(t)), `${biome}: vapnet ligger ute ${JSON.stringify(seen.items)}`);
  await shot(biome);
}
// drömriket: de glidande väggarna går upp och ned i spelet
{
  const found = await ev(() => { for (let s = 1; s < 40; s++) { const L = Gen.floor(s * 31 + 7, 3, { biome: 'dream' }); if (L.shifts.length >= 3) return s * 31 + 7; } return null; });
  await ev(seed => { const g = __game, L = Gen.floor(seed, 3, { biome: 'dream' }); g.run().depth = 3; g.startLevel(L); for (const e of g.ents()) { e.alert = false; e.sleep = true; e.d = { ...e.d, speed: 0, dmg: 0 }; } }, found);
  const sh = await ev(() => __game.lvl().shifts);
  const states = sh.map(() => new Set());
  for (let k = 0; k < 18; k++) { const m = await ev(() => __game.mapRef().map(r => r.join ? r.join('') : r)); sh.forEach((s, i) => states[i].add(m[s.y][s.x])); await wait(300); }
  ok(states.every(st => st.has('ƣ') && st.has('.')), 'glidande väggarna växlar mellan vägg och golv ' + states.map(st => [...st].join('')).join(','));
  await shot('dream_shift');
}
// arenarum i de nya biomerna
for (const biome of ['cathedral', 'dream', 'hive']) {
  const found = await ev(biome => { for (let s = 1; s < 80; s++) for (const d of [2, 3, 4, 5]) { const L = Gen.floor(s * 7919 + d, d, { biome }); if (L.arenas && L.arenas.length) return [s * 7919 + d, d]; } return null; }, biome);
  if (!found) { ok(false, 'ingen arena i ' + biome); continue; }
  await ev(([seed, d, biome]) => { const g = __game, L = Gen.floor(seed, d, { biome }); g.run().depth = d; g.startLevel(L); }, [...found, biome]);
  await wait(1000);
  await ev(() => { const g = __game, a = g.arenasRef()[0], P = g.P; for (const e of g.ents()) { e.alert = false; e.sleep = true; e.d = { ...e.d, speed: 0, dmg: 0 }; } P.x = a.x0 + 1.5; P.y = a.y0 + 1.5; });
  await wait(800);
  ok(await ev(() => !!__game.arenaCurRef()), biome + ': arenan startar');
  for (let w = 0; w < 5; w++) { await ev(() => { const g = __game, a = g.arenasRef()[0]; g.P.x = a.x0 + 1.5; g.P.y = a.y0 + 1.5; for (const e of g.ents()) if (e.arena && !e.dead) { e.hidden = false; e.up = true; e.anchored = true; g.hurtEnemy(e, 9999, e.x, e.y, {}); } }); await wait(1700); }
  ok(await ev(() => !__game.arenaCurRef() && __game.arenasRef()[0].state === 'done'), biome + ': arenan klar');
}
// bossarenorna med sina bossar
for (const [arena, boss] of [['cathedral', 'cardinal'], ['hive', 'queenbee'], ['garden', 'gardener'], ['dream', 'sandman']]) {
  await ev(([arena, boss]) => { const g = __game, L = Gen.boss(12345, { arena, boss }); L.bossId = boss; g.run().depth = 6; g.startLevel(L); }, [arena, boss]);
  await wait(1500);
  ok(await ev(boss => !!__game.boss() && __game.boss().id === boss, boss), `${arena}: bossen ${boss} finns`);
  await shot('boss_' + arena);
}
await done();
