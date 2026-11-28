# Ritar Kryptas programikon (256×256 PNG) med spelets typsnitt: ett rött K på mörk sten.
import sys
from PIL import Image, ImageDraw, ImageFont
root, out = sys.argv[1], sys.argv[2]
S = 64
im = Image.new('RGBA', (S, S), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
d.rounded_rectangle((1, 1, S - 2, S - 2), radius=8, fill=(26, 20, 24, 255), outline=(90, 60, 50, 255), width=2)
for y in range(6, S - 6, 8):  # stenfogar
    off = 0 if (y // 8) % 2 else 8
    d.line((4, y, S - 5, y), fill=(36, 28, 32, 255))
    for x in range(4 + off, S - 4, 16): d.line((x, y, x, y + 7), fill=(36, 28, 32, 255))
f = ImageFont.truetype(root + '/assets/font/PressStart2P.ttf', 40)
for dx, dy, c in ((3, 3, (40, 8, 8, 255)), (0, 0, (216, 64, 40, 255))):
    d.text((S // 2 + dx, S // 2 + 2 + dy), 'K', font=f, fill=c, anchor='mm')
im.resize((256, 256), Image.NEAREST).save(out)
