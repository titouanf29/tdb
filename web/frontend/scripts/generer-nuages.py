"""
Génère les images de nuages du site (public/nuages/).

Un nuage dessiné en direct (SVG + flou gaussien) coûte cher au navigateur :
le flou est recalculé à la taille d'affichage, et à chaque changement. Ces
images sont dessinées une fois pour toutes ; la page ne fait plus que les
déplacer, les agrandir et les estomper, ce que la carte graphique fait
sans rien redessiner.

LE VOLUME. La première version posait un dégradé vertical sur la silhouette
entière : un nuage plat, un papier découpé. Ici chaque lobe est éclairé
comme une sphère, par une lumière venue du haut à gauche (un reflet
décentré, une ombre vers le bas et la droite), les lobes de devant portent
une ombre de contact sur ceux de derrière, le dessous de la masse est plus
sombre, et une ombre douce flotte sous le nuage. C'est ce qui le fait
avancer de l'écran sans rien changer à sa silhouette : les pages qui le
déplacent, l'agrandissent ou l'estompent ne voient aucune différence.

Usage : python scripts/generer-nuages.py            (nécessite playwright et Pillow)
        python scripts/generer-nuages.py --apercu   (un aperçu sur ciel, dans le dossier courant)
Les silhouettes sont celles de SILHOUETTES dans design-system/CloudLayer.tsx.
"""
import io, os, sys
from PIL import Image
from playwright.sync_api import sync_playwright

SILHOUETTES = [
    ([(58, 60, 26), (92, 46, 32), (126, 56, 28), (152, 64, 20), (38, 68, 18)], (96, 70, 66, 14)),
    ([(64, 52, 28), (96, 36, 26), (124, 50, 26), (148, 62, 20), (40, 64, 18)], (96, 68, 62, 13)),
    ([(54, 64, 22), (86, 54, 28), (118, 52, 26), (148, 60, 24), (174, 68, 15)], (108, 71, 72, 12)),
    ([(78, 56, 26), (106, 44, 24), (132, 58, 22), (56, 66, 18)], (96, 68, 50, 12)),
]
FLOUS = [2.4, 3.5, 5, 7]
# (reflet, lumière, mi-ombre, ombre) : le reflet est la teinte la plus claire,
# l'ombre celle du dessous. Les trois dernières sont les jetons --cap-cloud-*.
TEINTES = {
    "clair": ("#FFFFFF", "#FDFDFE", "#E2E9F1", "#BCC9DA"),
    "sombre": ("#4A5D75", "#3B4D63", "#26344A", "#16202F"),
}
# L'ombre portée au sol : la couleur, et son opacité par thème.
OMBRE = {"clair": ("#8FA3BA", 0.22), "sombre": ("#0B1726", 0.45)}
M = 30                      # marge pour que le flou et l'ombre ne soient jamais coupés
ECHELLE = 3                 # 260 × 160 unités → 780 × 480 pixels
SORTIE = os.path.join(os.path.dirname(__file__), "..", "public", "nuages")


def svg(forme, flou, teinte):
    lobes, base = SILHOUETTES[forme]
    reflet, light, mid, shade = TEINTES[teinte]
    ombre, op_ombre = OMBRE[teinte]
    bx, by, brx, bry = base
    # Les lobes du fond d'abord (les plus hauts), ceux de devant ensuite : une
    # sphère basse passe devant une sphère haute, comme dans un vrai cumulus.
    ordre = sorted(lobes, key=lambda l: l[1])
    silhouette = f'<ellipse cx="{bx}" cy="{by}" rx="{brx}" ry="{bry}"/>' + "".join(
        f'<circle cx="{cx}" cy="{cy}" r="{r}"/>' for cx, cy, r in lobes)
    corps = []
    for cx, cy, r in ordre:
        # L'ombre de contact : la sphère assombrit ce qu'il y a derrière elle,
        # juste en dessous d'elle. Coupée à la silhouette : rien ne déborde.
        corps.append(f'<circle cx="{cx}" cy="{cy + r * 0.18}" r="{r}" fill="{shade}" opacity="0.34" filter="url(#contact)"/>')
        corps.append(f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="url(#sphere)"/>')
    # Le dessous de la masse : la base, plus sombre vers le bas.
    corps.append(f'<ellipse cx="{bx}" cy="{by}" rx="{brx}" ry="{bry}" fill="url(#base)"/>')
    # Un voile de lumière sur le tiers supérieur, pour que les reflets des
    # sphères se fondent en un seul éclairage.
    corps.append(f'<rect x="-{M}" y="-{M}" width="{200 + 2 * M}" height="{100 + 2 * M}" fill="url(#voile)"/>')
    w, h = (200 + 2 * M) * ECHELLE, (100 + 2 * M) * ECHELLE
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{-M} {-M} {200 + 2 * M} {100 + 2 * M}" width="{w}" height="{h}">'
        '<defs>'
        # La sphère : reflet décentré en haut à gauche, ombre vers le bas et la droite.
        f'<radialGradient id="sphere" cx="0.36" cy="0.30" r="0.78" fx="0.30" fy="0.24">'
        f'<stop offset="0" stop-color="{reflet}"/><stop offset="0.38" stop-color="{light}"/>'
        f'<stop offset="0.74" stop-color="{mid}"/><stop offset="1" stop-color="{shade}"/></radialGradient>'
        f'<linearGradient id="base" x1="0" y1="0" x2="0" y2="1">'
        f'<stop offset="0" stop-color="{mid}" stop-opacity="0"/><stop offset="0.45" stop-color="{mid}"/>'
        f'<stop offset="1" stop-color="{shade}"/></linearGradient>'
        f'<linearGradient id="voile" x1="0" y1="0" x2="0" y2="1">'
        f'<stop offset="0" stop-color="{reflet}" stop-opacity="0.55"/><stop offset="0.42" stop-color="{reflet}" stop-opacity="0"/></linearGradient>'
        f'<filter id="contact" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="3.2"/></filter>'
        f'<filter id="sol" x="-40%" y="-80%" width="180%" height="260%"><feGaussianBlur stdDeviation="7"/></filter>'
        f'<filter id="doux" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="{flou}"/></filter>'
        f'<clipPath id="forme">{silhouette}</clipPath>'
        '</defs>'
        # L'ombre au sol, sous le nuage, qui le détache du ciel.
        f'<ellipse cx="{bx}" cy="{by + bry + 9}" rx="{brx * 0.78}" ry="{5.5}" fill="{ombre}" opacity="{op_ombre}" filter="url(#sol)"/>'
        # Le corps : tout est coupé à la silhouette, puis adouci d'un flou.
        f'<g filter="url(#doux)"><g clip-path="url(#forme)">{"".join(corps)}</g></g>'
        '</svg>'), w, h


def apercu(page, dossier):
    """Un aperçu des quatre formes, sur le ciel du site, pour juger le volume."""
    from PIL import ImageDraw
    fond = Image.new("RGBA", (4 * 520 + 100, 2 * 330 + 60), (0, 0, 0, 0))
    ciel = ImageDraw.Draw(fond)
    for y in range(fond.height):
        t = y / fond.height
        c = tuple(int(a + (b - a) * t) for a, b in zip((252, 253, 254), (194, 208, 224)))
        ciel.line([(0, y), (fond.width, y)], fill=c + (255,))
    for k, teinte in enumerate(TEINTES):
        for forme in range(4):
            code, w, h = svg(forme, 3.5, teinte)
            page.set_viewport_size({"width": w, "height": h})
            page.set_content(f'<html><body style="margin:0;background:transparent">{code}</body></html>')
            png = page.screenshot(omit_background=True, clip={"x": 0, "y": 0, "width": w, "height": h})
            img = Image.open(io.BytesIO(png)).convert("RGBA").resize((520, 320), Image.LANCZOS)
            fond.alpha_composite(img, (50 + forme * 520, 20 + k * 330))
    chemin = os.path.join(dossier, "apercu-nuages.png")
    fond.save(chemin)
    print("aperçu :", chemin)


if __name__ == "__main__":
    mode_apercu = "--apercu" in sys.argv
    with sync_playwright() as pw:
        b = pw.chromium.launch(executable_path=os.environ.get("CHROMIUM", "/opt/pw-browsers/chromium"))
        p = b.new_page()
        if mode_apercu:
            apercu(p, os.getcwd())
        else:
            os.makedirs(SORTIE, exist_ok=True)
            total = 0
            for teinte in TEINTES:
                for forme in range(len(SILHOUETTES)):
                    for flou in FLOUS:
                        code, w, h = svg(forme, flou, teinte)
                        p.set_viewport_size({"width": w, "height": h})
                        p.set_content(f'<html><body style="margin:0;background:transparent">{code}</body></html>')
                        png = p.screenshot(omit_background=True, clip={"x": 0, "y": 0, "width": w, "height": h})
                        nom = os.path.join(SORTIE, f"{forme}-{str(flou).replace('.', '_')}-{teinte}.webp")
                        Image.open(io.BytesIO(png)).save(nom, "WEBP", quality=82, method=6)
                        total += os.path.getsize(nom)
            print(f"{len(TEINTES) * len(SILHOUETTES) * len(FLOUS)} images, {total // 1024} Ko au total")
        b.close()
