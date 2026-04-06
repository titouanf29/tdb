from PIL import Image, ImageFilter

src_path = r"C:/Users/Utilisateur/Downloads/LOGO-CaptenTDB (1).png"
out_path = r"C:/Users/Utilisateur/Documents/GitHub/tdb/web/frontend/public/branding/logo-capten-base-sharp-v2.png"

img = Image.open(src_path).convert("RGBA")
# stronger crispness
img = img.filter(ImageFilter.UnsharpMask(radius=2.4, percent=260, threshold=2))
img = img.filter(ImageFilter.EDGE_ENHANCE_MORE)
img.save(out_path)
print(out_path)