from PIL import Image
img = Image.open(r"C:/Users/Utilisateur/Downloads/LOGO-CaptenTDB (1).png").convert('RGB')
W,H = img.size
maxv = -1
maxp = (0,0)
for y in range(0,H,5):
    for x in range(0,W,5):
        r,g,b = img.getpixel((x,y))
        v = r+g+b
        if v>maxv:
            maxv=v
            maxp=(x,y)
print('max', maxv, maxp, img.getpixel(maxp))
PY