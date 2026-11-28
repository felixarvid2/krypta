// ---------- Version 25.1: egna himlar per biom ----------
// gfx/sky_<biom>.png (512x96, 360° vågrätt) laddas i loadAll; renderWorld väljer spr['sky_' + biom] före natthimlen (skyOwn).
// skyApi är krokarna för t118: vilka biomer som har en egen himmel och vilken himmel som ritades senast (skyPrep sätter skyZenOf).
const skyApi = {
  own: () => Object.keys(spr).filter(k => k.startsWith('sky_') && spr[k] && spr[k].data).map(k => k.slice(4)),
  used: () => !skyZenOf ? null : skyZenOf === spr.sky ? 'night' : (Object.keys(spr).find(k => k.startsWith('sky_') && spr[k] === skyZenOf) || '?').slice(4),
  isOwn: () => skyOwn,
  colors: b => { const s = b === 'night' ? spr.sky : spr['sky_' + b]; return s ? [...new Set(s.data)] : []; },
};
const rollCan = document.createElement('canvas'); rollCan.width = W; rollCan.height = VH; const rollCtx = rollCan.getContext('2d');
function desaturate(k) {
  const px = spx; for (let i = 0; i < px.length; i++) { const c = px[i], r = c & 255, g = (c >> 8) & 255, b = (c >> 16) & 255, l = (r * 0.3 + g * 0.59 + b * 0.11);
    px[i] = 0xff000000 | (((b + (l - b) * k) | 0) << 16) | (((g + (l - g) * k) | 0) << 8) | ((r + (l - r) * k) | 0); }
}
// Tecknar en billboard-sprite. size = höjd i världsenheter, z = höjd över golvet. tint = [r,g,b] färgton.
let spriteOutline = 0;
let spriteSX = 1, spriteSY = 1, spriteClip = 0; // FIENDER: skala x/y kring fötterna (squash & stretch) och klipp vid golvet (stiger upp/sjunker ned) – nollställs för varje sprite i listan
