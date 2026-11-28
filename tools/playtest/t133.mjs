// t133: version 26C – hånknappen på pekskärmen. På en telefon (915×412 liggande och 412×915 stående, pekskärm) syns klockknappen
// bara med ALLA KNAPPAR, ligger helt inne i skärmen, överlappar ingen annan synlig knapp, och ett tryck på den hånar (samma som Y).
// I den nya layouten (utan ALLA KNAPPAR) syns den inte. Inga sidfel.
import { setup } from './head.mjs';
const PORT = 9833;
const { pg, ok, done } = await setup(PORT, 'out/t133');
const errs = [];
const phone = async (w, h, all) => {
  const c = await pg.context().browser().newContext({ viewport: { width: w, height: h }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 });
  const p = await c.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.goto(`http://localhost:${PORT}/index.html?nolock=1`); await p.waitForFunction('!document.getElementById("start").disabled', null, { timeout: 90000 });
  await p.evaluate(all => { localStorage.removeItem('krypta.run'); const g = __game; g.profile.tutDone = true; g.settings.allButtons = all; g.begin('new'); }, all);
  await p.waitForTimeout(1500); await p.keyboard.press('Escape'); await p.waitForTimeout(1500); // som t97: stäng kortvalet
  await p.waitForFunction(() => __game.state() === 'play', null, { timeout: 30000 }).catch(() => {});
  await p.waitForTimeout(800);
  const r = await p.evaluate(() => { const ui = document.getElementById('touch'), b = ui.querySelector('.tauntb'); if (!b) return null;
    const vis = el => { const s = getComputedStyle(el); const q = el.getBoundingClientRect(); return s.display !== 'none' && s.visibility !== 'hidden' && q.width > 0 && q.height > 0; };
    const rb = b.getBoundingClientRect(), box = q => ({ x: Math.round(q.left), y: Math.round(q.top), w: Math.round(q.width), h: Math.round(q.height) });
    const over = [...ui.querySelectorAll('.tb')].filter(o => o !== b && vis(o)).filter(o => { const q = o.getBoundingClientRect(); return q.left < rb.right - 1 && q.right > rb.left + 1 && q.top < rb.bottom - 1 && q.bottom > rb.top + 1; }).map(o => o.dataset.act);
    return { all: ui.classList.contains('all'), vis: vis(b), box: box(rb), inside: rb.left >= 0 && rb.top >= 0 && rb.right <= innerWidth && rb.bottom <= innerHeight, over }; });
  return { c, p, r };
};
for (const [w, h, name] of [[915, 412, 'liggande'], [412, 915, 'stående']]) {
  const A = await phone(w, h, true);
  ok(A.r && A.r.all && A.r.vis && A.r.inside && A.r.over.length === 0, `ALLA KNAPPAR, ${name}: klockknappen syns, ligger inne i skärmen och överlappar inget ` + JSON.stringify(A.r));
  await A.p.screenshot({ path: `out/t133/alla_${name}.png` });
  if (A.r && A.r.vis) { // ett tryck (pekskärmens pointerdown) hånar
    const t0 = await A.p.evaluate(() => __game.v26c.st.taunts);
    await A.p.touchscreen.tap(A.r.box.x + A.r.box.w / 2, A.r.box.y + A.r.box.h / 2); await A.p.waitForTimeout(300);
    const t1 = await A.p.evaluate(() => __game.v26c.st.taunts);
    ok(t1 === t0 + 1, `ALLA KNAPPAR, ${name}: ett tryck på klockan hånar ` + JSON.stringify([t0, t1]));
  }
  await A.c.close();
  const B = await phone(w, h, false);
  ok(B.r && !B.r.all && !B.r.vis, `den nya layouten, ${name}: klockknappen syns inte ` + JSON.stringify(B.r));
  await B.c.close();
}
ok(errs.length === 0, 'inga sidfel på telefonerna ' + errs.join(' / '));
await done();
