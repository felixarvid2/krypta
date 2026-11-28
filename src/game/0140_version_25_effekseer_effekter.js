// ---------- Version 25: Effekseer-effekter ----------
// Förrenderade spritestrippar (tools/effekseer: Effekseers CC0-exempel, renderade offline med EffekseerForWebGL och efterbehandlade
// till spelets pixelstil). Ingen Effekseer-runtime i spelet. Explosioner (explode), magiträffar (magiska skott som slocknar) och
// teleporter/framträdanden (spawnPuff), och laddningen hos magiska skyttar (gfxETele). En partikel per händelse i den vanliga listan
// (frames + additiv), ingen ny kod per bildruta. lowfx (även den automatiska) stänger av dem och de gamla effekterna finns kvar;
// noFlash tonar in och dämpar explosionen.
const EFX = { off: false, n: { boom: 0, magic: 0, tele: 0, charge: 0, skip: 0 }, last: [] };
const EFX_FRAMES = { boom: 12, magic: 10, tele: 12 }, EFX_CAP = 10; // högst 10 levande effektsprites
const EFX_NEAR = { boom: 1.0, magic: 1.2, tele: 0.6 }; // inte närmare kameran än så (en additiv sprite tätt intill fyller skärmen)
const EFX_MAGIC = { orb: 1, orb2: 1, wave: 1, sorb: 1, blue: 1, bolt: 1, skull: 1, ice: 1, hex: 1, illu: 1, prune: 1, dstar: 1, estar: 1, curse: 1 };
async function efxLoad() { // valfri: saknas en stripp används de gamla effekterna
  fx.efx = {};
  for (const k in EFX_FRAMES) { try { fx.efx[k] = strip(await load(`${A}gfx/efx_${k}.png`), EFX_FRAMES[k]); } catch (e) { /* valfri */ } }
  if (fx.efx.magic) fx.efx.charge = fx.efx.magic.slice(1, 8).reverse(); // laddningen: magiträffen baklänges (ljuset samlas)
}
function efxOk(k, x, y) {
  if (EFX.off || settings.lowfx || !fx.efx || !fx.efx[k]) return false;
  const dx = x - P.x, dy = y - P.y, d2 = dx * dx + dy * dy; if (d2 > 400 || d2 < EFX_NEAR[k] * EFX_NEAR[k]) return false; // bara inom 20 rutor och inte vid kameran
  let live = 0; for (const p of particles) if (p.efx) live++;
  if (live >= pcap(EFX_CAP)) { // version 27: taket skalas med partikelbudgeten
    if (k === 'boom' || k === 'burst') { const i = particles.findIndex(p => p.efx && p.efx !== 'boom' && p.efx !== 'burst'); if (i >= 0) { particles.splice(i, 1); EFX.n.evict = (EFX.n.evict || 0) + 1; return true; } } // en smäll får ta platsen från den äldsta lågan, giftet eller liknande
    EFX.n.skip++; return false; }
  return true;
}
function efxBoom(x, y, r, big) { // stor explosion: eldklot + chockvåg (komponerad av tre Effekseer-lager)
  if (!efxOk('boom', x, y) || solid(x, y)) return;
  const f = fx.efx.boom, size = clamp(0.9 + r * 0.45, 1.3, 2.6) * (big ? 1.15 : 1), nf = !!settings.noFlash; // noFlash: tonas in och ut och dämpas
  if (wpPart({ x, y, z: Math.max(-0.35, 0.5 - size / 2), vx: 0, vy: 0, vz: 0, life: 0.8, frames: f, img: f[0], size, add: true, fade: nf, tint: nf ? [170, 160, 150] : null, efx: 'boom' }, true)) EFX.n.boom++;
}
function efxMagic(p) { // magiskt skott som slocknar eller träffar: stjärnburst i skottets färg
  if (!EFX_MAGIC[p.kind] || !efxOk('magic', p.x, p.y)) return;
  const f = fx.efx.magic, size = p.big ? 1.1 : 0.8, x = p.x - p.vx * 0.02, y = p.y - p.vy * 0.02;
  if (wpPart({ x, y, z: (p.z ?? 0.5) - size / 2, vx: 0, vy: 0, vz: 0, life: 0.5, frames: f, img: f[0], size, add: true, tint: PROJ_TINT[p.kind] || WP_MAGIC[p.kind] || [190, 120, 255], efx: 'magic' }, true)) EFX.n.magic++;
}
function efxProjDead() { for (const p of projectiles) if (p.dead && !p.efxd) { p.efxd = true; efxMagic(p); } } // anropas före filtreringen i updateProjectiles
function efxTele(x, y, n = 5) { // teleport, framträdande eller försvinnande: ljuspelare från en ring på golvet
  if (n < 4 || !efxOk('tele', x, y)) return; // små puffar (föremål) får ingen pelare
  for (const l of EFX.last) if (Math.abs(tmr - l.t) < 0.4 &&Math.abs(l.x - x) + Math.abs(l.y - y) < 0.8) { EFX.n.skip++; return; } // samma ställe nyss
  EFX.last.push({ x, y, t: tmr }); if (EFX.last.length > 6) EFX.last.shift();
  const f = fx.efx.tele, size = clamp(1.1 + n * 0.06, 1.3, 1.9);
  if (wpPart({ x, y, z: 0, vx: 0, vy: 0, vz: 0, life: 0.9, frames: f, img: f[0], size, add: true, tint: [200, 160, 255], efx: 'tele' }, true)) EFX.n.tele++;
}
function efxCharge(o, k, col) { // magiska skyttar (kultist, nekromant, benmagiker, orkshaman …): laddningen i handen strax före skottet
  if (!EFX_MAGIC[o.d.proj] || EFX.off || settings.lowfx || !fx.efx || !fx.efx.charge) return false; // anropas från gfxETele vid ritningen
  const f = fx.efx.charge, { dirX, dirY } = view, size = 0.3 + 0.35 * k;
  drawSprite(f[Math.min(f.length - 1, (k * f.length) | 0)], o.x - dirX * 0.08, o.y - dirY * 0.08, size, o.d.size * 0.55 - size / 2, false, 1.2 + k * 0.6, 0, 0, true, col);
  EFX.n.charge++; return true;
}
const efxApi = { state: () => ({ loaded: Object.fromEntries(Object.keys(EFX_FRAMES).map(k => [k, !!(fx.efx && fx.efx[k])])), on: !EFX.off && !settings.lowfx, n: { ...EFX.n }, live: (particles || []).filter(p => p.efx).length }),
  setOff: v => { EFX.off = !!v; }, // prov: före/efter-mätning och jämförelsebild
  boom: (x, y, r = 2, big = false) => efxBoom(x, y, r, big), magic: (x, y, kind = 'orb') => efxMagic({ x, y, z: 0.5, vx: 0, vy: 0, kind }), tele: (x, y) => efxTele(x, y, 6),
  puff: (x, y, n = 6) => spawnPuff(x, y, n) }; // den riktiga vägen för teleporter och framträdanden

