// Dödsorsaken blir aldrig tom eller kvarglömd: dödsstöten tillskrivs som skadeloggen gör (närmaste fiende inom 3,5 rutor, annars PROJEKTILER/FÄLLOR/MILJÖN)
import { setup } from './head.mjs';
const PORT = 8900 + Math.floor(Math.random() * 90);
const { pg, ev, wait, ok, done } = await setup(PORT, 'out/tl_b_2_1');

// ny sida (utan god om inte q säger annat), tom 24×16-bana med spelaren på (3,8) och utgången på (20,8)
async function arena(q = '') {
  await pg.goto(`http://localhost:${PORT}/index.html?nolock=1${q}`);
  await pg.waitForFunction('!document.getElementById("start").disabled', { timeout: 90000 });
  await ev(() => {
    const g = __game; g.profile.tutDone = true; const W = 24, H = 16, grid = [];
    for (let y = 0; y < H; y++) { const r = []; for (let x = 0; x < W; x++) r.push(x === 0 || y === 0 || x === W - 1 || y === H - 1 ? '1' : '.'); grid.push(r); }
    grid[8][3] = 'P'; grid[8][20] = 'x'; g.playCustom({ grid, biome: 'dungeon' });
  });
  await wait(1500);
  { const t0 = Date.now(); while (Date.now() - t0 < 8000 && await ev(() => __game.state()) !== 'play') await wait(100); }
  return ev(() => __game.state());
}

// (A) ingen källa → MILJÖN
{
  const st = await arena();
  const r = await ev(() => {
    const g = __game, P = g.P; if (g.state() !== 'play') return { pre: g.state() };
    P.iframe = 0; P.shield = 0; P.armor = 0; P.hp = 1; g.run().cause = '';
    g.hurtPlayer(500);
    return { state: g.state(), cause: g.run().cause };
  });
  ok(st === 'play' && !r.pre, `(A) banan är igång (${st}${r.pre ? ', ' + r.pre : ''})`);
  ok(r.state === 'dead' && r.cause === 'MILJÖN', `(A) dödande träff utan källa bokförs på MILJÖN ${JSON.stringify(r)}`);
}

// (B) projektil utan någon i närheten → PROJEKTILER
{
  const st = await arena();
  const r = await ev(() => {
    const g = __game, P = g.P; if (g.state() !== 'play') return { pre: g.state() };
    const fx = P.x + 6, fy = P.y;
    const near = g.ents().filter(e => !e.dead && Math.hypot(e.x - fx, e.y - fy) < 3.5).length;
    P.iframe = 0; P.shield = 0; P.armor = 0; P.hp = 1; g.run().cause = '';
    g.hurtPlayer(500, fx, fy, 'proj');
    return { near, state: g.state(), cause: g.run().cause };
  });
  ok(st === 'play' && !r.pre && r.near === 0, `(B) banan är igång och ingen entitet finns inom 3,5 rutor från källpunkten ${JSON.stringify(r)}`);
  ok(r.state === 'dead' && r.cause === 'PROJEKTILER', `(B) dödande projektil utan fiende i närheten bokförs på PROJEKTILER ${JSON.stringify(r)}`);
}

// (C) källpunkten 1,5 rutor från en fiende (inte på dess plats) → fiendens namn
{
  const st = await arena();
  const r = await ev(() => {
    const g = __game, P = g.P; if (g.state() !== 'play') return { pre: g.state() };
    const e = g.spawnEnemy('S', P.x + 6, P.y + 0.5); e.d = { ...e.d, speed: 0, dmg: 0 };
    const fx = e.x + 1.5, fy = e.y;
    const closer = g.ents().filter(o => o !== e && !o.dead && Math.hypot(o.x - fx, o.y - fy) <= 1.5).length;
    P.iframe = 0; P.shield = 0; P.armor = 0; P.hp = 1; g.run().cause = '';
    g.hurtPlayer(500, fx, fy, 'proj');
    return { name: e.d.name, closer, state: g.state(), cause: g.run().cause };
  });
  ok(st === 'play' && !r.pre && r.closer === 0 && typeof r.name === 'string' && r.name.length > 0, `(C) fienden finns, har ett namn och ingen annan står närmare källpunkten ${JSON.stringify(r)}`);
  ok(r.state === 'dead' && r.cause === r.name, `(C) dödsstöten bokförs på närmaste fiende inom 3,5 rutor ${JSON.stringify(r)}`);
}

// (D) en kvarglömd orsak töms av en träff som inte dödar; nästa dödande träff utan källa blir MILJÖN
{
  const st = await arena();
  const r = await ev(() => {
    const g = __game, P = g.P; if (g.state() !== 'play') return { pre: g.state() };
    g.run().cause = 'SÅGKLINGAN'; P.shield = 0; P.armor = 0; P.hp = 100; P.iframe = 0;
    g.hurtPlayer(5);
    const mid = { state: g.state(), hp: P.hp, cause: g.run().cause };
    P.iframe = 0; P.shield = 0; P.armor = 0; P.hp = 1;
    g.hurtPlayer(500);
    return { mid, state: g.state(), cause: g.run().cause };
  });
  ok(st === 'play' && !r.pre, `(D) banan är igång (${st}${r.pre ? ', ' + r.pre : ''})`);
  ok(r.mid && r.mid.state === 'play' && r.mid.hp > 0 && r.mid.hp < 100, `(D) spelaren tar skada men lever efter den lilla träffen ${JSON.stringify(r.mid)}`);
  ok(r.mid && r.mid.cause === '', `(D) den kvarglömda orsaken töms direkt efter träffen ${JSON.stringify(r.mid)}`);
  ok(r.state === 'dead' && r.cause === 'MILJÖN', `(D) senare dödande träff utan källa bokförs på MILJÖN, inte SÅGKLINGAN ${JSON.stringify(r)}`);
}

// (E) oförändrat: orsaken som sattes precis före en dödande träff utan källa står kvar
{
  const st = await arena();
  const r = await ev(() => {
    const g = __game, P = g.P; if (g.state() !== 'play') return { pre: g.state() };
    P.iframe = 0; P.shield = 0; P.armor = 0; P.hp = 1; g.run().cause = 'LAVA';
    g.hurtPlayer(500);
    return { state: g.state(), cause: g.run().cause };
  });
  ok(st === 'play' && !r.pre, `(E) banan är igång (${st}${r.pre ? ', ' + r.pre : ''})`);
  ok(r.state === 'dead' && r.cause === 'LAVA', `(E) orsaken som sattes precis före dödsstöten står kvar ${JSON.stringify(r)}`);
}

// (F) oförändrat: exakt källträff på en fiende går före run.cause
{
  const st = await arena();
  const r = await ev(() => {
    const g = __game, P = g.P; if (g.state() !== 'play') return { pre: g.state() };
    const e = g.spawnEnemy('S', P.x + 4, P.y); e.d = { ...e.d, speed: 0, dmg: 0 };
    P.iframe = 0; P.shield = 0; P.armor = 0; P.hp = 1; g.run().cause = 'SÅGKLINGAN';
    g.hurtPlayer(500, e.x, e.y, 'melee');
    return { name: e.d.name, state: g.state(), cause: g.run().cause };
  });
  ok(st === 'play' && !r.pre && typeof r.name === 'string' && r.name.length > 0, `(F) banan är igång och fienden har ett namn ${JSON.stringify(r)}`);
  ok(r.state === 'dead' && r.cause === r.name, `(F) exakt källträff bokförs på fienden, inte på SÅGKLINGAN ${JSON.stringify(r)}`);
}

// (G) oförändrat: gudläget tömmer inte orsaken
{
  const st = await arena('&god=1');
  const r = await ev(() => {
    const g = __game, P = g.P; if (g.state() !== 'play') return { pre: g.state() };
    g.run().cause = 'SÅGKLINGAN'; P.hp = 100; P.iframe = 0;
    g.hurtPlayer(5);
    return { state: g.state(), hp: P.hp, cause: g.run().cause };
  });
  ok(st === 'play' && !r.pre, `(G) banan är igång i gudläge (${st}${r.pre ? ', ' + r.pre : ''})`);
  ok(r.state === 'play' && r.cause === 'SÅGKLINGAN', `(G) gudläget lämnar orsaken orörd ${JSON.stringify(r)}`);
}

await done();
