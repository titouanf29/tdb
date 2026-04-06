from PIL import Image
img = Image.open(r"C:/Users/Utilisateur/Downloads/LOGO-CaptenTDB (1).png").convert('RGB')
px = img.load()
W,H = img.size
pts = []
for y in range(H):
    for x in range(W):
        r,g,b = px[x,y]
        if r>140 and g>110 and b<90:
            pts.append((x,y))
print('pts', len(pts))
if pts:
    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]
    print('bbox', min(xs), min(ys), max(xs), max(ys))
    min_x = min(xs)
    near = [p for p in pts if p[0] <= min_x+3]
    avgx = sum(p[0] for p in near)/len(near)
    avgy = sum(p[1] for p in near)/len(near)
    print('tail', avgx, avgy, 'count', len(near))