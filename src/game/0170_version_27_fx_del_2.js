// ---------- Version 27: FX del 2 – dödseffekter efter material och spår efter fiendeskotten ----------
// Fiender som inte blöder (BLOOD och version 23 sköter köttet och benen) dör efter vad de är gjorda av: metall sprutar gnistor och
// ryker och tappar skruvar och kugghjul, spöken löses upp i virvlar som stiger, slem stänker (pölen kommer från version 23),
// kristall och is splittras och glittrar, eld flammar upp och lämnar aska. Fiendernas skott får spår efter sort: eldklot ryker,
// magiska kulor har en gnistrande svans, pilar en tunn strimma och syra droppar. Allt läses av från fx27Tick (ingen krok i
// killEnemy/gfxEKill eller i projektilerna): en fiende som just dött och inte sprängts i bitar (gib sköter det), och skott nära spelaren.
// Samma tak som resten av version 27 (partikellistan till 120), lowfx stänger av, FX27.f.kill och FX27.f.trails är spärrar.
Object.assign(FX27.f, { kill: true, trails: true });
Object.assign(FX27.n, { kill: { metal: 0, ghost: 0, slime: 0, crystal: 0, fire: 0 }, trails: { fire: 0, magic: 0, arrow: 0, acid: 0 } });
const FX27_GHOST = { steamghost: [235, 235, 235], shadowtwin: [170, 120, 255], voidwatcher: [170, 120, 255], snowwraith: [205, 232, 255], sandwraith: [235, 205, 145], banshee: [190, 230, 255], lostsoul: [255, 170, 110] };
function fx27Mat(e) { // vad fienden är gjord av, för dödseffekten (null = kött och ben: BLOOD och version 23)
  if (e.fx27M !== undefined) return e.fx27M; const s = (e.d && e.d.sheet) || '', ai = e.d && e.d.ai; let m = null;
  if ((ai === 'wisp' && !/spark|shard/.test(s)) || /^ghost|banshee|lostsoul|^wisp$|vialwisp|windspirit|steamghost|wraith|shadowtwin|voidwatcher/.test(s)) m = 'ghost';
  else if (/fireelemental|fireimp|^imp$|lavaworm|moltengolem|coalgolem|ashwalker/.test(s)) m = 'fire';
  else if (/crystal|shard|icewolf|mirrorknight/.test(s)) m = 'crystal';
  else { const k = gfxEKind(e); m = k === 'metal' ? 'metal' : k === 'slime' ? 'slime' : null; }
  return (e.fx27M = m);
}
function fx27Kill(e) { // en fiende har just dött (och sprängdes inte i bitar)
  const m = fx27Mat(e); if (!m || (e.gibbed && (m === 'metal' || m === 'slime'))) return; // gib (version 23) sköter bitarna av metall och slem const dx = e.x - P.x, dy = e.y - P.y; if (dx * dx + dy * dy > 256) return;
  FX27.n.kill[m]++; const sz = e.d.size * (e.formK || 1), x = e.x, y = e.y, zc = sz * 0.45, I = fx27Imgs(), nf = !!settings.noFlash;
  if (m === 'metal') {
    for (let i = 0; i < 7; i++) { const a = rnd(0, TAU), sp = rnd(1, 3); fx27Cool(fx27P({ x, y, z: zc, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: rnd(1, 2.6), life: rnd(0.5, 0.9), img: I.dot, size: 0.026, add: true, grav: true, bounce: true, tint: [255, 230, 150] }), 'spark'); }
    const sm = fx.parts.smoke || fx.hit; for (let i = 0; i < 2; i++) fx27P({ x: x + rnd(-0.15, 0.15), y: y + rnd(-0.15, 0.15), z: zc, vx: rnd(-0.1, 0.1), vy: rnd(-0.1, 0.1), vz: rnd(0.3, 0.5), life: rnd(1.2, 1.7), frames: sm, img: sm[0], size: rnd(0.2, 0.28) * sz, drift: true, tint: [80, 76, 72] });
    const bo = gfxEImg.bolt, ge = fx.parts.gear; for (let i = 0; i < 4; i++) { const f = bo && i % 2 ? bo : ge || bo; if (!f) break; const a = rnd(0, TAU), sp = rnd(0.8, 2); fx27P({ x, y, z: zc, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: rnd(1.5, 2.8), life: rnd(1.4, 2), frames: f, img: f[0], flap: true, size: f === bo ? rnd(0.08, 0.11) : rnd(0.05, 0.08), grav: true, bounce: true }); } // skruvar och kugghjul
    if (!nf) wpLight(x, y, 0.25, 2, 1, [255, 200, 120]);
  } else if (m === 'ghost') {
    const col = FX27_GHOST[e.d.sheet] || [160, 235, 225];
    const sw = [I.star, I.dot]; for (let i = 0; i < 16; i++) { const a = i / 16 * TAU * 2, r = (0.12 + i / 16 * 0.25) * sz; fx27P({ x: x + Math.cos(a) * r, y: y + Math.sin(a) * r, z: zc * (0.3 + i / 16), vx: -Math.sin(a) * 0.7, vy: Math.cos(a) * 0.7, vz: rnd(0.5, 0.9), life: rnd(1.1, 1.7), frames: sw, img: sw[i & 1], sway: a, size: rnd(0.06, 0.1), add: true, fade: true, drift: true, tint: col }); } // virvlar som stiger (en spiral uppåt)
    fx27P({ x, y, z: zc - 0.15, vx: 0, vy: 0, vz: 0.4, life: 0.8, img: I.star, size: 0.2 * sz, add: true, fade: true, drift: true, tint: col.map(v => Math.round(v * (nf ? 0.5 : 0.9))) }); // ett sista sken
  } else if (m === 'slime') {
    const c = gfxESlimeCol(e), dr = (fx.parts.drop || fx.hit)[0];
    for (let i = 0; i < 10; i++) { const a = rnd(0, TAU), sp = rnd(0.6, 1.8); fx27P({ x, y, z: zc * 0.6, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: rnd(1, 2.4), life: rnd(0.5, 0.9), img: dr, size: rnd(0.035, 0.05), grav: true, tint: c }); } // stänket
    for (let i = 0; i < 8; i++) { const b = i / 8 * TAU; fx27P({ x: x + Math.cos(b) * 0.15, y: y + Math.sin(b) * 0.15, z: 0.01, vx: Math.cos(b) * 0.9, vy: Math.sin(b) * 0.9, vz: 0, life: 0.55, img: fx.hit[1], size: 0.035, add: true, fade: true, tint: c }); } // ringen på golvet (pölen: version 23)
  } else if (m === 'crystal') {
    if (e.frozen > 0) return; // frusna fiender splittras redan (version 25.1)
    const tint = /icewolf/.test(e.d.sheet) ? [205, 235, 255] : BIOME_TINT[lvl.biome] || [200, 170, 255], sh = fx.parts.glassshard || fx.parts.shard;
    for (let i = 0; i < 8; i++) { const a = rnd(0, TAU), sp = rnd(1, 2.6); fx27P({ x, y, z: zc, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: rnd(1.2, 2.8), life: rnd(0.9, 1.4), frames: sh || null, img: sh ? sh[i % sh.length] : I.dot, flap: !!sh, size: rnd(0.05, 0.08), grav: true, bounce: true, tint }); } // skärvorna
    for (let i = 0; i < 7; i++) fx27P({ x: x + rnd(-0.3, 0.3) * sz, y: y + rnd(-0.3, 0.3) * sz, z: zc * rnd(0.3, 1.4), vx: 0, vy: 0, vz: rnd(0.1, 0.35), life: rnd(0.5, 0.9), img: I.star, size: rnd(0.05, 0.09), add: true, fade: true, drift: true, tint }); // glitter
    if (!nf) wpLight(x, y, 0.3, 2, 0.9, tint);
  } else { // eld: flammar upp, glöd stiger och aska singlar ned
    const fl = fx.parts.flame || fx.fire, em = fx.parts.ember || [fx.hit[1]], ash = fx.parts.ashfall || fx.parts.ash || fx.parts.smoke || fx.hit;
    for (let i = 0; i < 3; i++) fx27P({ x: x + rnd(-0.15, 0.15), y: y + rnd(-0.15, 0.15), z: rnd(0, 0.2), vx: 0, vy: 0, vz: rnd(0.5, 0.9), life: rnd(0.45, 0.65), frames: fl, img: fl[0], size: rnd(0.35, 0.5) * sz, add: true, drift: true, tint: nf ? [190, 110, 50] : null });
    for (let i = 0; i < 8; i++) fx27Cool(fx27P({ x: x + rnd(-0.2, 0.2), y: y + rnd(-0.2, 0.2), z: rnd(0.1, zc * 1.5), vx: rnd(-0.4, 0.4), vy: rnd(-0.4, 0.4), vz: rnd(0.6, 1.3), life: rnd(0.8, 1.4), img: em[i % em.length], size: 0.035, add: true, drift: true, tint: [255, 230, 150] }), 'ember');
    for (let i = 0; i < 6; i++) fx27P({ x: x + rnd(-0.3, 0.3), y: y + rnd(-0.3, 0.3), z: rnd(0.5, 1) * sz, vx: rnd(-0.1, 0.1), vy: rnd(-0.1, 0.1), vz: -rnd(0.12, 0.25), life: rnd(2.2, 3.2), frames: ash, img: ash[0], sway: rnd(0, 6), size: rnd(0.025, 0.04), drift: true, tint: [95, 90, 88] }); // aska
    if (!nf) wpLight(x, y, 0.4, 3, 1.4, [255, 140, 50]);
  }
}
const FX27_PT = { fire: 'fire', magma: 'fire', flare: 'fire', spark: 'fire', orb: 'magic', orb2: 'magic', sorb: 'magic', blue: 'magic', skull: 'magic', illu: 'magic', curse: 'magic', hex: 'magic', wave: 'magic', ice: 'magic', estar: 'magic', bolt: 'magic',
  arrow: 'arrow', spear: 'arrow', knife: 'arrow', axe: 'arrow', acid: 'acid', poison: 'acid', sporeb: 'acid' };
const FX27_ACID = { acid: [150, 255, 80], poison: [140, 220, 90], sporeb: [185, 255, 125] };
function fx27Trails(dt) { // fiendernas skott nära spelaren: spår efter sort (VAPEN ritar redan ljussvansen)
  const I = fx27Imgs(); let n = 0;
  for (const p of projectiles) { if (p.dead || p.friendly) continue; const k = p.kind === undefined ? 'fire' : FX27_PT[p.kind]; if (!k) continue;
    const dx = p.x - P.x, dy = p.y - P.y; if (dx * dx + dy * dy > 196) continue;
    p.f27 = (p.f27 || 0) + dt; if (p.f27 < (k === 'arrow' ? 0.03 : k === 'fire' ? 0.06 : 0.05)) continue; p.f27 = 0;
    if (++n > 12 || particles.length >= FX27_SOFT) break;
    const z = p.z ?? 0.5, bx = p.x - p.vx * 0.03, by = p.y - p.vy * 0.03; FX27.n.trails[k]++;
    if (k === 'fire') { const sm = fx.parts.smoke || fx.hit; fx27P({ x: bx, y: by, z: z - 0.05, vx: rnd(-0.1, 0.1), vy: rnd(-0.1, 0.1), vz: 0.3, life: 0.7, frames: sm, img: sm[0], size: p.big ? 0.13 : 0.09, drift: true, tint: [78, 72, 68] }); // eldklotet ryker
      if (Math.random() < 0.35) fx27Cool(fx27P({ x: bx, y: by, z, vx: rnd(-0.6, 0.6), vy: rnd(-0.6, 0.6), vz: rnd(0.2, 0.8), life: 0.5, img: (fx.parts.ember || fx.hit)[0], size: 0.025, add: true, grav: true, tint: [255, 220, 140] }), 'ember'); }
    else if (k === 'magic') { const c = PROJ_TINT[p.kind] || [190, 120, 255]; for (let i = 0; i < 2; i++) fx27P({ x: bx + rnd(-0.05, 0.05), y: by + rnd(-0.05, 0.05), z: z + rnd(-0.06, 0.06), vx: rnd(-0.4, 0.4), vy: rnd(-0.4, 0.4), vz: rnd(-0.5, 0.1), life: rnd(0.25, 0.4), img: i ? I.dot : I.star, size: i ? 0.02 : 0.035, add: true, fade: true, drift: true, tint: c }); } // gnistrande svans
    else if (k === 'arrow') { for (let i = 0; i < 2; i++) fx27P({ x: p.x - p.vx * 0.012 * (i + 1), y: p.y - p.vy * 0.012 * (i + 1), z, vx: 0, vy: 0, vz: 0, life: 0.12, img: I.dot, size: 0.014, add: true, fade: true, tint: [210, 200, 170] }); } // tunn strimma
    else fx27P({ x: bx, y: by, z: z - 0.03, vx: p.vx * 0.05, vy: p.vy * 0.05, vz: -0.2, life: 0.6, img: (fx.parts.drop || fx.hit)[0], size: 0.03, grav: true, tint: FX27_ACID[p.kind] || [150, 255, 80] }); // syran droppar
  }
}
function fx27Tick2(dt) { // från fx27Tick
  const kill = fx27On('kill');
  for (const e of ents) { if (e.boss) continue; if (!e.dead) { e.fx27L = 1; continue; } if (e.fx27L === 1) { e.fx27L = 2; if (kill) fx27Kill(e); } }
  if (fx27On('trails') && dt > 0) fx27Trails(dt);
}
Object.assign(fx27Api, { mat: e => fx27Mat(e), kill: e => fx27Kill(e), trails: dt => fx27Trails(dt || 0.1) });

