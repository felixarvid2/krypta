// ---------- Vägsökning: avståndsfält (BFS) från spelaren ----------
function walkableForEnemy(x, y) { const c = map[y][x]; return !isWallChar(c) && c !== 'Đ' && c !== 'Ń' && c !== 'Ź' && c !== 'f' && c !== 'M' && c !== '·' && c !== '¬' && !isPropChar(c) && c !== '*' && c !== '_' && !(hazGrid && hazGrid[y * mw + x])
  && !((c === 'G' || c === '|' || c === ']') && doors[x + ',' + y].open < 0.85); } // fiender undviker lava och fällor
function updateFlow() {
  const pc = (P.y | 0) * mw + (P.x | 0);
  if (pc === flowCell) return;
  flowCell = pc; flow.fill(-1);
  const q = [pc]; flow[pc] = 0;
  for (let h = 0; h < q.length; h++) {
    const c = q[h], x = c % mw, y = (c / mw) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= mw || ny >= mh) continue;
      const n = ny * mw + nx; if (flow[n] >= 0 || !walkableForEnemy(nx, ny)) continue;
      flow[n] = flow[c] + 1; q.push(n);
    }
  }
}
const pathDist = e => { const v = flow[(e.y | 0) * mw + (e.x | 0)]; return v < 0 ? 999 : v; };

// ---------- Uppdatering ----------
function ripple(x, y) { for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; particles.push({ x: x + Math.cos(a) * 0.15, y: y + Math.sin(a) * 0.15, z: 0.01, vx: Math.cos(a) * 0.8, vy: Math.sin(a) * 0.8, vz: 0, life: 0.5, maxLife: 0.5, img: fx.hit[1], size: 0.03, add: true, tint: [180, 210, 240], fade: true }); } } // vattenringar
function stepSound() { // fotsteg låter olika på gräs, grus, trä och sten
  gfxWStep(); // VÄRLD: damm och plask vid fötterna
  v27Step(); // version 27 (BLOOD): blodiga fotspår efter en pöl
  const ch = cellUnder(); if (ch === '-') { ripple(P.x, P.y); return ['splash', 0.25, rnd(1.1, 1.4)]; }
  const fln = (lvl.floors || [lvl.floor])[cellFloor ? cellFloor[(P.y | 0) * mw + (P.x | 0)] : 0] || '';
  if (/snow/.test(fln)) { if (fx.parts.footprint) { decals.push({ x: P.x + rnd(-0.08, 0.08), y: P.y + rnd(-0.08, 0.08), img: fx.parts.footprint[0], size: 0.04, life: 25 }); if (decals.length > 70) decals.shift(); } return ['snow_step', 0.3, rnd(0.9, 1.1)]; } // fotspår i snön if (ch === ':') return ['step_gravel', 0.12, 1.6];
  const n = (lvl.floors || [lvl.floor])[cellFloor ? cellFloor[(P.y | 0) * mw + (P.x | 0)] : 0] || '';
  if (/grass/.test(n)) return ['step_grass', 0.22, 1];
  if (/gravel|dirt|mud|cave/.test(n)) return ['step_gravel', 0.16, 1];
  if (/wood|floor_dock/.test(n)) return ['step_wood', 0.2, 1];
  if (/straw/.test(n)) return ['step_grass', 0.16, 0.8]; // version 21: bryggplank och halm
  if (/sand|desert/.test(n)) return snd.step_sand ? ['step_sand', 0.2, rnd(0.9, 1.1)] : ['step_gravel', 0.12, rnd(0.65, 0.75)]; // mjuk sand
  return ['steps', 0.1, 1.65];
}
