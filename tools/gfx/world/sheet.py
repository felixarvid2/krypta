# VÄRLD: sätter ihop före/efter-serierna till ett ark per biom (övre raden före, undre efter). python3 tools/gfx/world/sheet.py <mapp> <biom> ...
import sys
from PIL import Image
d = sys.argv[1]
for b in sys.argv[2:]:
    rows = []
    for k in ('fore', 'efter'):
        ims = [Image.open(f'{d}/{b}_{k}_{n}.png').convert('RGB') for n in range(4)]
        w, h = ims[0].size
        ims = [im.crop((0, h // 3, w, h)).resize((w // 2, (h - h // 3) // 2)) for im in ims]
        rows.append(ims)
    w, h = rows[0][0].size
    out = Image.new('RGB', (w * 4 + 6, h * 2 + 4), (20, 20, 20))
    for r, ims in enumerate(rows):
        for i, im in enumerate(ims): out.paste(im, (i * (w + 2), r * (h + 4)))
    out.save(f'{d}/{b}_ark.png')
    print(f'{d}/{b}_ark.png')
