// En träff som studsar av (osårbarhet, undvikande, noll skada) glömmer sin dödsorsak, så en senare dödsstöt utan källa ärver den inte
import { setup } from './head.mjs';
const PORT = 8900 + Math.floor(Math.random() * 90);
const { pg, ev, wait, ok, done } = await setup(PORT, 'out/tl_e_1_2');

// ny sida, tom 24×16-bana med spelaren på (3,8) och utgången på (20,8)
async function arena() {
  await pg.goto(`http://localhost:${PORT}/index.html?nolock=1`);
  await pg.waitForFunction('!document.getElementById("start").disabled', { timeout: 90000 });
  await ev(() => {
    const g = __game; g.profile.tutDone = true; const W = 24, H = 16, grid = [];
    for (let y = 0; y < H; y++) { const r = []; for (let x = 0; x < W; x++) r.push(x === 0 || y === 0 || x === W - 1 || y === H - 1 ? '1' : '.'); grid.push(r); }
    grid[8][3] = 'P'; grid[8][20] = 'x'; g.playCustom({ grid, biome: 'dungeon' });
  });
  { const t0 = Date.now(); while (Date.now() - t0 < 8000 && await ev(() => __game.state()) !== 'play') await wait(100); }
  return ev(() => __game.state());
}

// (A) osårbarhet: träffen under P.iframe studsar av och glömmer SPIKFÄLLA
{
  const st = await arena();
  const r = await ev(() => {
    const g = __game, P = g.P; if (g.state() !== 'play') return { pre: g.state() };
    P.shield = 0; P.armor = 0;
    P.hp = 50; P.iframe = 1; g.run().cause = 'SPIKFÄLLA';
    g.hurtPlayer(10);
    const mid = { hp: P.hp, state: g.state() };
    P.iframe = 0; P.hp = 1;
    g.hurtPlayer(500);
    return { mid, state: g.state(), cause: g.run().cause };
  });
  ok(st === 'play' && !r.pre, `(A) banan är igång (${st}${r.pre ? ', ' + r.pre : ''})`);
  ok(r.mid && r.mid.hp === 50 && r.mid.state === 'play', `(A) träffen under osårbarheten gör ingen skada ${JSON.stringify(r.mid)}`);
  ok(r.state === 'dead' && r.cause === 'MILJÖN', `(A) senare dödsstöt utan källa bokförs på MILJÖN, inte SPIKFÄLLA ${JSON.stringify(r)}`);
}

// (B) undvikande: den undvikna träffen glömmer SPIKFÄLLA
{
  const st = await arena();
  const r = await ev(() => {
    const g = __game, P = g.P; if (g.state() !== 'play') return { pre: g.state() };
    P.shield = 0; P.armor = 0;
    P.iframe = 0; P.hp = 50; g.mods().dodge = 1; g.run().cause = 'SPIKFÄLLA';
    g.hurtPlayer(10);
    const mid = { hp: P.hp, state: g.state() };
    g.mods().dodge = 0; P.iframe = 0; P.hp = 1;
    g.hurtPlayer(500);
    return { mid, state: g.state(), cause: g.run().cause };
  });
  ok(st === 'play' && !r.pre, `(B) banan är igång (${st}${r.pre ? ', ' + r.pre : ''})`);
  ok(r.mid && r.mid.hp === 50 && r.mid.state === 'play', `(B) den undvikna träffen gör ingen skada ${JSON.stringify(r.mid)}`);
  ok(r.state === 'dead' && r.cause === 'MILJÖN', `(B) senare dödsstöt utan källa bokförs på MILJÖN, inte SPIKFÄLLA ${JSON.stringify(r)}`);
}

// (C) noll skada (som ÅNGVENTILEN med full ventResist): träffen glömmer ÅNGVENTILEN
{
  const st = await arena();
  const r = await ev(() => {
    const g = __game, P = g.P; if (g.state() !== 'play') return { pre: g.state() };
    P.shield = 0; P.armor = 0;
    P.iframe = 0; P.hp = 50; g.run().cause = 'ÅNGVENTILEN';
    g.hurtPlayer(0);
    const mid = { hp: P.hp, state: g.state() };
    P.iframe = 0; P.hp = 1;
    g.hurtPlayer(500);
    return { mid, state: g.state(), cause: g.run().cause };
  });
  ok(st === 'play' && !r.pre, `(C) banan är igång (${st}${r.pre ? ', ' + r.pre : ''})`);
  ok(r.mid && r.mid.hp === 50 && r.mid.state === 'play', `(C) träffen på noll gör ingen skada ${JSON.stringify(r.mid)}`);
  ok(r.state === 'dead' && r.cause === 'MILJÖN', `(C) senare dödsstöt utan källa bokförs på MILJÖN, inte ÅNGVENTILEN ${JSON.stringify(r)}`);
}

// (D) kontroll: orsaken som sattes precis före dödsstöten gäller; (E) en träff efter döden suddar den inte ut
{
  const st = await arena();
  const r = await ev(() => {
    const g = __game, P = g.P; if (g.state() !== 'play') return { pre: g.state() };
    P.shield = 0; P.armor = 0;
    P.iframe = 0; P.hp = 1; g.run().cause = 'SPIKFÄLLA';
    g.hurtPlayer(500);
    const d = { state: g.state(), cause: g.run().cause };
    g.hurtPlayer(10);
    return { d, state: g.state(), cause: g.run().cause };
  });
  ok(st === 'play' && !r.pre, `(D) banan är igång (${st}${r.pre ? ', ' + r.pre : ''})`);
  ok(r.d && r.d.state === 'dead' && r.d.cause === 'SPIKFÄLLA', `(D) orsaken som sattes precis före dödsstöten står kvar ${JSON.stringify(r.d)}`);
  ok(r.d && r.d.state === 'dead' && r.cause === 'SPIKFÄLLA', `(E) en träff efter döden suddar inte ut orsaken ${JSON.stringify(r)}`);
}

await done();
