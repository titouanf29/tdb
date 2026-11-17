"""Une mer de nuages au couchant, vue d'avion, en perspective. Rendu calculé une fois.

Pour chaque pixel sous l'horizon, on retrouve le point de la nappe de nuages qu'il voit
(perspective sur un plan), on y lit un bruit fractal (le relief des nuages), et on
l'éclaire à contre-jour : le soleil est bas, derrière, les bords tournés vers lui
s'allument d'or, le reste reste bleu nuit. Le lointain se fond dans la brume dorée."""
import sys
import numpy as np
from PIL import Image, ImageFilter

W, H = int(sys.argv[1]), int(sys.argv[2])
graine = int(sys.argv[3]) if len(sys.argv) > 3 else 3
rng = np.random.default_rng(graine)

def bruit_valeur(taille=256):
    g = rng.random((taille, taille)).astype(np.float32)
    return g

GRILLES = [bruit_valeur() for _ in range(7)]

def echantillon(g, x, y):
    n = g.shape[0]
    x0 = np.floor(x).astype(np.int64); y0 = np.floor(y).astype(np.int64)
    fx = x - x0; fy = y - y0
    fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy)
    x0 %= n; y0 %= n; x1 = (x0 + 1) % n; y1 = (y0 + 1) % n
    a = g[y0, x0]; b = g[y0, x1]; c = g[y1, x0]; d = g[y1, x1]
    return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy

def fbm(x, y, octaves=5):
    v = np.zeros_like(x); amp = .5; f = 1.0
    for o in range(octaves):
        v += amp * echantillon(GRILLES[o], x * f + o * 17.3, y * f + o * 9.1)
        amp *= .5; f *= 2.03
    return v

horizon = int(H * .40)
ys, xs = np.mgrid[0:H, 0:W].astype(np.float32)
sous = ys > horizon
# Profondeur : la distance au point vu sur la nappe, plus grande près de l'horizon.
dy = np.maximum(ys - horizon, 1.0)
z = (H * .55) / dy
u = (xs - W * .5) / W * z * 3.2
v = z * 1.15

def lisse(a, r):
    """Flou gaussien séparable d'un champ numpy."""
    n = int(r * 3) + 1
    k = np.exp(-(np.arange(-n, n + 1) ** 2) / (2 * r * r)).astype(np.float32); k /= k.sum()
    a = np.apply_along_axis(lambda l: np.convolve(np.pad(l, n, mode="edge"), k, mode="valid"), 1, a)
    return np.apply_along_axis(lambda l: np.convolve(np.pad(l, n, mode="edge"), k, mode="valid"), 0, a)

# Les grandes masses, puis le moutonnement des sommets, plus fin, qui donne le volume.
dens = lisse(fbm(u * 0.9 + 3.0, v * 0.9), 1.4) * .78 + lisse(fbm(u * 3.1 + 9.0, v * 3.1 + 4.0, 4), 1.0) * .22
# Les nuages : des masses découpées, pas un voile uniforme.
# Des masses gonflées : un seuil doux, puis un arrondi.
masse = np.clip((dens - .41) * 4.2, 0, 1)
masse = masse * masse * (3 - 2 * masse)
# Relief : la pente vers le soleil (bas de l'écran vers le haut, légèrement à droite).
# Le relief se lit sur la masse lissée : gradient vers le soleil, à l'écran.
gy, gx = np.gradient(lisse(masse, 1.6))
lumiere = np.clip((-gy * 1.0 + gx * .3) * 22.0, 0, 1) ** .7
# Les sommets épais prennent aussi un peu de lumière diffuse.
lumiere = np.clip(lumiere + masse * .18, 0, 1)

# Couleurs.
ciel_haut = np.array([4, 7, 13], np.float32); ciel_bas = np.array([40, 34, 36], np.float32)
or_vif = np.array([246, 198, 132], np.float32); or_doux = np.array([180, 128, 86], np.float32)
nuit = np.array([14, 20, 34], np.float32); bleu = np.array([46, 54, 74], np.float32)
brume = np.array([150, 112, 82], np.float32)

t = np.clip(ys / max(horizon, 1), 0, 1)[..., None]
img = ciel_haut * (1 - t) ** 1.6 + ciel_bas * (1 - (1 - t) ** 1.6)
# Le soleil, sous l'horizon, à droite : une lueur large.
sx, sy = W * .7, horizon + H * .02
dist = np.sqrt(((xs - sx) / W) ** 2 + ((ys - sy) / H * 1.9) ** 2)[..., None]
img = img + np.array([255, 170, 95], np.float32) * np.clip(.62 - dist, 0, 1) ** 2 * 1.9

# La nappe : base bleu nuit, bords éclairés d'or, plus d'or près du soleil.
proche_soleil = np.clip(1 - dist[..., 0] * 1.6, 0, 1)
couleur = nuit[None, None] * (1 - masse[..., None]) + bleu * masse[..., None]
eclat = (lumiere * masse * (.35 + .9 * proche_soleil))[..., None]
couleur = couleur + (or_doux * (1 - proche_soleil[..., None]) + or_vif * proche_soleil[..., None]) * eclat
# Le lointain se fond dans la brume dorée de l'horizon.
loin = np.clip(1 - (ys - horizon) / (H * .40), 0, 1)[..., None] ** 1.6
couleur = couleur * (1 - loin) + (brume * .55 + img * .45) * loin
img = np.where(sous[..., None], couleur, img)
# L'horizon ne coupe pas net : une brume dorée le traverse.
bande = np.exp(-((ys - horizon) / (H * .035)) ** 2)[..., None]
img = img * (1 - bande * .6) + (brume * .8 + np.array([60, 40, 30], np.float32) * proche_soleil[..., None]) * bande * .6
# Assombrir le haut et la gauche, où se pose le texte.
voile = np.clip(1 - ys / (H * .62), 0, 1) ** 1.2 * .55 + np.clip(1 - xs / (W * .55), 0, 1) * .25
img = img * (1 - voile[..., None])

im = Image.fromarray(np.clip(img, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(.7))
im.save(sys.argv[4] if len(sys.argv) > 4 else "mer.png")
