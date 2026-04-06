from PIL import Image, ImageDraw, ImageFilter

src_path = r"C:/Users/Utilisateur/Downloads/LOGO-CaptenTDB (1).png"
out_path = r"C:/Users/Utilisateur/Documents/GitHub/tdb/web/frontend/public/branding/logo-capten-c.png"

img = Image.open(src_path).convert("RGBA")
W, H = img.size

# Positioning for the C (near arrow tail)
# Based on analysis: tail around (810, 1087) on 2000x2000 canvas
c_w = 280
c_h = 280
x0 = int(810 - 140)  # center around tail
x1 = x0 + c_w
y0 = int(1087 - 90)  # place slightly above tail to attach
# clamp
if x0 < 0: x0 = 0
if y0 < 0: y0 = 0
x1 = min(W - 1, x0 + c_w)
y1 = min(H - 1, y0 + c_h)

# Build C mask
mask = Image.new("L", (W, H), 0)
draw = ImageDraw.Draw(mask)

th = 36
# Outer ring
outer = [x0, y0, x1, y1]
inner = [x0 + th, y0 + th, x1 - th, y1 - th]

draw.rectangle(outer, fill=255)
draw.rectangle(inner, fill=0)

# Open right side
gap_x0 = x1 - int(th * 1.2)
gap = [gap_x0, y0 + int(th * 0.6), x1, y1 - int(th * 0.6)]
draw.rectangle(gap, fill=0)

# Angular cuts at top-right / bottom-right
tri_top = [(gap_x0, y0), (x1, y0), (x1, y0 + int(th * 1.2))]
tri_bot = [(gap_x0, y1), (x1, y1), (x1, y1 - int(th * 1.2))]
draw.polygon(tri_top, fill=0)
draw.polygon(tri_bot, fill=0)

# Create gradient for C
w = x1 - x0
h = y1 - y0
grad = Image.new("RGBA", (w, h), (0, 0, 0, 0))
px = grad.load()
# Gold gradient (darker -> brighter)
from_color = (166, 116, 44)  # darker gold
to_color = (247, 206, 63)    # bright gold

def lerp(a, b, t):
    return int(a + (b - a) * t)

for yy in range(h):
    for xx in range(w):
        t = (xx + (h - yy)) / max(1, (w + h))
        r = lerp(from_color[0], to_color[0], t)
        g = lerp(from_color[1], to_color[1], t)
        b = lerp(from_color[2], to_color[2], t)
        px[xx, yy] = (r, g, b, 255)

# Paste C using mask
c_layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
c_layer.paste(grad, (x0, y0))
img = Image.composite(c_layer, img, mask)

# Sharpen overall for crispness
img = img.filter(ImageFilter.UnsharpMask(radius=1.6, percent=160, threshold=3))

img.save(out_path)
print(out_path)