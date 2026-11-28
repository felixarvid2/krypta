// Återupplivningen (extraLife) räddar spelaren när klockan eller labyrinttiden tar slut – och bara en gång
// (tidigare: kortet förbrukades men klockan/tiden låg kvar under noll och dödade igen nästa bildruta)
import { setup } from './head.mjs';
const PORT = 8900 + Math.floor(Math.random() * 90);
const { pg, ev, wait, ok, done } = await setup(PORT, 'out/tl_f_1_1');

// vänta på ett villkor med tidsgräns; returnerar sista värdet
async function until(f, ms, a) { const t0 = Date.now(); let v = await ev(f, a); while (!v && Date.now() - t0 < ms) { await wait(50); v = await ev(f, a); } return v; }
// fiender ska varken röra sig eller skada (det är inte det som testas)
const calm = () => ev(() => { for (const e of __game.ents()) e.d = { ...e.d, speed: 0, dmg: 0 }; });
const snap = () => ev(() => { const g = __game, r = g.run() || {}; return { state: g.state(), livesUsed: r.livesUsed, hp: g.P.hp, clockT: r.clockT, cause: r.cause, left: r.maze ? r.maze.limit - g.levelTime() : null }; });

async function loadPage() {
  await pg.goto(`http://localhost:${PORT}/index.html?nolock=1`);
  await pg.waitForFunction('!document.getElementById("start").disabled', { timeout: 90000 });
}
async function toPlay(ms) {
  await wait(ms);
  if (await ev(() => __game.state()) !== 'play') await pg.keyboard.press('Escape');
  return await until(() => __game.state() === 'play', 8000);
}
async function startClock() {
  await loadPage();
  await ev(() => { const g = __game; g.profile.tutDone = true; g.settings.cmode = 'clock'; localStorage.removeItem('krypta.run'); g.begin('new'); });
  const inPlay = await toPlay(1200);
  await calm(); await wait(3000); await calm();
  // klockan ska ha tickat ner från startvärdet, men inte vara slut
  const pre = await snap();
  return { inPlay, pre };
}
// låt tiden ta slut och vänta (högst 1,5 s) på döden; tiden återställs till nästan noll om en
// spontan fiendedöd skulle hinna lägga till klocktid innan den hann ta slut
const expireUntilDead = maze => until(maze => { const g = __game; if (g.state() === 'dead') return true;
  if (g.state() === 'play') { g.P.iframe = 0; g.P.hp = Math.max(g.P.hp, 1);
    if (maze) { if (g.run().maze.limit - g.levelTime() > 0.1) g.run().maze.limit = g.levelTime() + 0.1; } else if (g.run().clockT > 0.05) g.run().clockT = 0.05; }
  return false; }, 1500, maze);

// FALL A: klockläget räddas av återupplivningen
{
  const { inPlay, pre } = await startClock();
  ok(inPlay && pre.state === 'play' && pre.clockT > 0, `A: klockläget startar och spelet är igång (${JSON.stringify(pre)})`);
  await calm();
  await ev(() => { const g = __game; g.mods().extraLife = 1; g.P.iframe = 0; g.P.hp = 100; g.run().clockT = 0.05; });
  await wait(600);
  const a = await snap();
  ok(a.state === 'play', `A: spelaren lever vidare efter att klockan tog slut (${JSON.stringify(a)})`);
  ok(a.livesUsed === 1, `A: återupplivningen förbrukades (livesUsed ${a.livesUsed})`);
  ok(a.hp > 0, `A: spelaren har HP kvar (${a.hp})`);
  ok(a.clockT >= 3.5 && a.clockT <= 12, `A: klockan fick ny tid efter räddningen (clockT ${a.clockT})`);

  // FALL B: bara en räddning – nästa gång klockan tar slut dör man
  await calm();
  await ev(() => { const g = __game; g.P.iframe = 0; g.P.hp = 100; g.run().clockT = 0.05; });
  const dead = await expireUntilDead(false);
  const b = await snap();
  ok(dead && b.state === 'dead', `B: andra gången klockan tar slut dör spelaren (${JSON.stringify(b)})`);
  ok(b.cause === 'KLOCKAN', `B: dödsorsaken är KLOCKAN (${b.cause})`);
}

// FALL C: kontroll utan återupplivning
{
  const { inPlay, pre } = await startClock();
  ok(inPlay && pre.state === 'play', `C: klockläget startar (${JSON.stringify(pre)})`);
  await calm();
  await ev(() => { const g = __game; g.mods().extraLife = 0; g.P.iframe = 0; g.P.hp = 100; g.run().clockT = 0.05; });
  const dead = await expireUntilDead(false);
  const c = await snap();
  ok(dead && c.state === 'dead', `C: utan kort dör spelaren när klockan tar slut (${JSON.stringify(c)})`);
  ok(!c.livesUsed, `C: ingen återupplivning användes (livesUsed ${c.livesUsed})`);
  ok(c.cause === 'KLOCKAN', `C: dödsorsaken är KLOCKAN (${c.cause})`);
}

// FALL D: labyrinten räddas av återupplivningen
{
  await loadPage();
  await ev(() => { const g = __game; g.profile.tutDone = true; g.settings.cmode = ''; localStorage.removeItem('krypta.run'); g.beginMaze(); });
  const inPlay = await toPlay(2500);
  const pre = await snap();
  ok(inPlay && pre.state === 'play' && pre.left !== null, `D: labyrinten startar (${JSON.stringify(pre)})`);
  await calm();
  await ev(() => { const g = __game; g.mods().extraLife = 1; g.P.iframe = 0; g.run().maze.limit = g.levelTime() + 0.1; });
  await wait(600);
  const d = await snap();
  ok(d.state === 'play', `D: spelaren lever vidare efter att labyrinttiden tog slut (${JSON.stringify(d)})`);
  ok(d.livesUsed === 1, `D: återupplivningen förbrukades (livesUsed ${d.livesUsed})`);
  ok(d.left >= 25 && d.left <= 30, `D: labyrinten gav ny tid efter räddningen (kvar ${d.left})`);

  // FALL E: bara en räddning i labyrinten
  await calm();
  await ev(() => { const g = __game; g.P.iframe = 0; g.run().maze.limit = g.levelTime() + 0.1; });
  const dead = await expireUntilDead(true);
  const e = await snap();
  ok(dead && e.state === 'dead', `E: andra gången labyrinttiden tar slut dör spelaren (${JSON.stringify(e)})`);
  ok(e.cause === 'TIDEN TOG SLUT', `E: dödsorsaken är TIDEN TOG SLUT (${e.cause})`);
}

await done();
