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
# Le creux des ombres, un ton sous l'ombre : c'est lui qui donne la profondeur.
CREUX = {"clair": "#9FB0C6", "sombre": "#0B1320"}
# L'ombre portée au sol : la couleur, et son opacité par thème.
OMBRE = {"clair": ("#7F95AE", 0.34), "sombre": ("#06101C", 0.6)}
M = 30                      # marge pour que le flou et l'ombre ne soient jamais coupés
ECHELLE = 3                 # 260 × 160 unités → 780 × 480 pixels
SORTIE = os.path.join(os.path.dirname(__file__), "..", "public", "nuages")


def bosses(lobes, base):
    """Les lobes de la silhouette, plus ce qui rend un cumulus moelleux : une
    petite bosse entre deux grands lobes voisins, deux bosses sur le sommet du
    plus gros, et une base faite de trois dômes bas plutôt qu'une ellipse."""
    tri = sorted(lobes, key=lambda l: l[0])
    out = list(tri)
    for (ax, ay, ar), (bx2, by2, br) in zip(tri, tri[1:]):
        r = 0.4 * min(ar, br)
        out.append(((ax + bx2) / 2, min(ay, by2) + 0.2 * r, r))
    gx, gy, gr = max(lobes, key=lambda l: l[2])
    out.append((gx - gr * 0.5, gy - gr * 0.55, gr * 0.42))
    bx, by, brx, bry = base
    # La base : des dômes bas et serrés, qui font un dessous rond sans boules.
    for k, f in ((-0.8, 1.3), (-0.42, 1.12), (0, 1.42), (0.42, 1.12), (0.8, 1.3)):
        out.append((bx + k * brx * 0.95, by - bry * (0.1 + 0.12 * (f - 1.12)), bry * f))
    return out


def svg(forme, flou, teinte):
    lobes, base = SILHOUETTES[forme]
    reflet, light, mid, shade = TEINTES[teinte]
    creux = CREUX[teinte]
    ombre, op_ombre = OMBRE[teinte]
    bx, by, brx, bry = base
    tous = bosses(lobes, base)
    # Les lobes du fond d'abord (les plus hauts), ceux de devant ensuite.
    ordre = sorted(tous, key=lambda l: l[1])
    silhouette = f'<ellipse cx="{bx}" cy="{by}" rx="{brx}" ry="{bry}"/>' + "".join(
        f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="{r:.1f}"/>' for cx, cy, r in tous)
    W, H = 200 + 2 * M, 100 + 2 * M
    corps = [f'<rect x="-{M}" y="-{M}" width="{W}" height="{H}" fill="{light}"/>']
    for cx, cy, r in ordre:
        # L'ombre de contact de chaque lobe sur ce qu'il y a derrière lui.
        corps.append(f'<circle cx="{cx:.1f}" cy="{cy + r * 0.2:.1f}" r="{r * 1.04:.1f}" fill="{creux}" opacity="0.42" filter="url(#contact)"/>')
        # Le modelé de sphère, assez transparent pour que la lumière d'ensemble passe.
        corps.append(f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="{r:.1f}" fill="url(#sphere)" opacity="0.72"/>')
    # La lumière d'ensemble, du haut à gauche vers le bas à droite : une seule
    # source pour toute la masse, c'est ce qui en fait un seul objet.
    corps.append(f'<rect x="-{M}" y="-{M}" width="{W}" height="{H}" fill="url(#lumiere)"/>')
    # Le dessous, plus sombre vers le bas.
    corps.append(f'<rect x="-{M}" y="-{M}" width="{W}" height="{H}" fill="url(#dessous)"/>')
    # L'occlusion : une bande d'ombre le long du bord bas et droit ; le liseré :
    # une bande de lumière le long du bord haut et gauche.
    corps.append(f'<g filter="url(#occlusion)" fill="{creux}" opacity="0.6">{silhouette}</g>')
    corps.append(f'<g filter="url(#liseret)" fill="{reflet}" opacity="0.95">{silhouette}</g>')
    # Trois reflets brillants, sur les lobes les plus hauts.
    for cx, cy, r in sorted(lobes, key=lambda l: l[1])[:3]:
        corps.append(f'<ellipse cx="{cx - r * 0.28:.1f}" cy="{cy - r * 0.4:.1f}" rx="{r * 0.3:.1f}" ry="{r * 0.16:.1f}" fill="{reflet}" opacity="0.8" filter="url(#brillant)"/>')
    w, h = W * ECHELLE, H * ECHELLE
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{-M} {-M} {W} {H}" width="{w}" height="{h}">'
        '<defs>'
        # La masse fondue : les lobes se rejoignent en courbes douces (flou puis
        # seuil sur l'alpha), comme des gouttes qui se touchent.
        '<filter id="fusion" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="2.6"/>'
        '<feComponentTransfer><feFuncA type="linear" slope="16" intercept="-6.2"/></feComponentTransfer></filter>'
        f'<mask id="masse" maskUnits="userSpaceOnUse" x="-{M}" y="-{M}" width="{W}" height="{H}"><g filter="url(#fusion)" fill="#fff">{silhouette}</g></mask>'
        f'<radialGradient id="sphere" cx="0.36" cy="0.30" r="0.80" fx="0.30" fy="0.24">'
        f'<stop offset="0" stop-color="{reflet}"/><stop offset="0.30" stop-color="{light}"/>'
        f'<stop offset="0.62" stop-color="{mid}"/><stop offset="0.88" stop-color="{shade}"/>'
        f'<stop offset="1" stop-color="{creux}"/></radialGradient>'
        f'<radialGradient id="lumiere" cx="0.3" cy="0.12" r="0.95">'
        f'<stop offset="0" stop-color="{reflet}" stop-opacity="0.7"/><stop offset="0.45" stop-color="{reflet}" stop-opacity="0"/>'
        f'<stop offset="1" stop-color="{creux}" stop-opacity="0.42"/></radialGradient>'
        f'<linearGradient id="dessous" x1="0" y1="0" x2="0" y2="1">'
        f'<stop offset="0.5" stop-color="{shade}" stop-opacity="0"/><stop offset="0.8" stop-color="{shade}" stop-opacity="0.55"/>'
        f'<stop offset="1" stop-color="{creux}" stop-opacity="0.8"/></linearGradient>'
        '<filter id="contact" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2.4"/></filter>'
        '<filter id="brillant" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="1.5"/></filter>'
        '<filter id="sol" x="-40%" y="-80%" width="180%" height="260%"><feGaussianBlur stdDeviation="8"/></filter>'
        '<filter id="occlusion" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="3.2" result="b"/>'
        '<feOffset in="SourceAlpha" dx="-2.8" dy="-3.6" result="o"/><feComposite in="b" in2="o" operator="out"/></filter>'
        '<filter id="liseret" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="2" result="b"/>'
        '<feOffset in="SourceAlpha" dx="2.2" dy="3" result="o"/><feComposite in="b" in2="o" operator="out"/></filter>'
        f'<filter id="doux" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="{flou * 0.5:.2f}"/></filter>'
        '</defs>'
        f'<ellipse cx="{bx}" cy="{by + bry + 11}" rx="{brx * 0.84}" ry="{7.5}" fill="{ombre}" opacity="{op_ombre}" filter="url(#sol)"/>'
        f'<g filter="url(#doux)"><g mask="url(#masse)">{"".join(corps)}</g></g>'
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
