# FIENDER: små pixelbilder för fiendernas bitar – ben (odöda), skruvar/muttrar (konstruktioner).
# python3 tools/gfx/fiender/make.py  → assets/gfx/gfx_en_bone.png (4 rutor, roterar), gfx_en_bolt.png (4 rutor)
from PIL import Image, ImageDraw
import os
OUT = os.path.join(os.path.dirname(__file__), '..', '..', '..', 'assets', 'gfx')
S = 16
def bone():
    b = Image.new('RGBA', (S, S), (0, 0, 0, 0)); d = ImageDraw.Draw(b)
    light, mid, dark = (238, 232, 212, 255), (200, 190, 165, 255), (120, 108, 90, 255)
    d.rectangle([4, 7, 11, 8], fill=light); d.line([4, 9, 11, 9], fill=mid)
    for x in (2, 12):  # knölarna i ändarna
        d.rectangle([x, 5, x + 1, 6], fill=light); d.rectangle([x, 9, x + 1, 10], fill=mid)
        d.rectangle([x + 1, 6, x + 2, 9], fill=light)
    d.point([(2, 7), (13, 8)], fill=dark); d.point([(4, 10), (11, 10)], fill=dark)
    return b
def bolt():
    b = Image.new('RGBA', (S, S), (0, 0, 0, 0)); d = ImageDraw.Draw(b)
    steel, hi, dark = (150, 155, 165, 255), (215, 220, 230, 255), (70, 72, 80, 255)
    d.rectangle([4, 5, 7, 10], fill=steel); d.line([4, 5, 4, 10], fill=hi); d.line([7, 5, 7, 10], fill=dark)  # mutterns huvud
    d.rectangle([8, 7, 12, 8], fill=steel); d.line([8, 6, 12, 6], fill=dark)
    for x in (9, 11): d.point([(x, 9)], fill=dark); d.point([(x, 7)], fill=hi)  # gängor
    return b
for name, f in (('bone', bone), ('bolt', bolt)):
    base = f(); sheet = Image.new('RGBA', (S * 4, S), (0, 0, 0, 0))
    for i in range(4): sheet.paste(base.rotate(i * 90 + 20, resample=Image.NEAREST), (i * S, 0))
    sheet.save(os.path.join(OUT, f'gfx_en_{name}.png')); print('skrev', f'gfx_en_{name}.png')
