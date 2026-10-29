import sys, glob, os
from PIL import Image, ImageDraw
pattern, out, cols = sys.argv[1], sys.argv[2], int(sys.argv[3])
crop = tuple(int(v) for v in sys.argv[4].split(",")) if len(sys.argv) > 4 else None
files = sorted(glob.glob(pattern))
ims = []
for f in files:
    im = Image.open(f).convert("RGB")
    if crop: im = im.crop(crop)
    d = ImageDraw.Draw(im)
    label = os.path.basename(f).rsplit("-", 1)[-1].split(".")[0]
    d.rectangle([0, 0, 46, 18], fill=(29, 19, 64))
    d.text((4, 3), "f" + str(int(label)), fill=(255, 255, 255))
    ims.append(im)
w, h = ims[0].size
rows = (len(ims) + cols - 1) // cols
sheet = Image.new("RGB", (cols * w + (cols - 1) * 4, rows * h + (rows - 1) * 4), (120, 120, 120))
for i, im in enumerate(ims):
    sheet.paste(im, ((i % cols) * (w + 4), (i // cols) * (h + 4)))
sheet.save(out)
print(out, sheet.size)
