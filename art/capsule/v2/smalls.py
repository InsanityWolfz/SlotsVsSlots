# The small-size read test for the v2 thumbnails: a crop of each main render to Steam's small capsule shape (462x174),
# scaled down smoothly the way Steam scales a list image, then 184x69 (the search and list size), plus a 3x zoom of it.
# python3 smalls.py <dir>   (reads vs.png, poster.png, payline.png there; writes <name>_small.png, _184.png, _184z.png,
# and compare_184.png with the current approved small capsule if ../steam/small.png exists)
import sys, os
from PIL import Image

d = sys.argv[1]
names = ['vs', 'poster', 'payline']
# per direction: the crop's top edge in the 1232x706 main (keeps the logo and the machines)
tops = {'vs': 30, 'poster': 30, 'payline': 40}
smalls = []
for n in names:
    im = Image.open(os.path.join(d, f'{n}.png')).convert('RGB')
    h = round(1232 * 174 / 462)
    crop = im.crop((0, tops[n], 1232, tops[n] + h))
    s = crop.resize((462, 174), Image.LANCZOS)
    s.save(os.path.join(d, f'{n}_small.png'))
    t = s.resize((184, 69), Image.LANCZOS)
    t.save(os.path.join(d, f'{n}_184.png'))
    t.resize((184 * 3, 69 * 3), Image.NEAREST).save(os.path.join(d, f'{n}_184z.png'))
    smalls.append(t)
cur = os.path.join(os.path.dirname(__file__), '..', 'steam', 'small.png')
row = []
if os.path.exists(cur):
    row.append(Image.open(cur).convert('RGB').resize((184, 69), Image.LANCZOS))
row += smalls
sheet = Image.new('RGB', (len(row) * 196 + 12, 81), (18, 10, 26))
for i, t in enumerate(row):
    sheet.paste(t, (12 + i * 196, 6))
sheet.save(os.path.join(d, 'compare_184.png'))
sheet.resize((sheet.width * 3, sheet.height * 3), Image.NEAREST).save(os.path.join(d, 'compare_184z.png'))
print('ok', len(row))
