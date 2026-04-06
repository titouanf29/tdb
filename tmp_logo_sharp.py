from PIL import Image, ImageFilter

src_path = r"C:/Users/Utilisateur/Downloads/LOGO-CaptenTDB (1).png"
out_path = r"C:/Users/Utilisateur/Documents/GitHub/tdb/web/frontend/public/branding/logo-capten-base-sharp.png"

img = Image.open(src_path).convert("RGBA")
# subtle contrast via unsharp + edge enhance
img = img.filter(ImageFilter.UnsharpMask(radius=1.8, percent=190, threshold=2))
img = img.filter(ImageFilter.DETAIL)
img.save(out_path)
print(out_path)