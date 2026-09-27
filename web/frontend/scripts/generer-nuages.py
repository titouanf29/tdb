"""
Génère les images de nuages de la page de présentation (public/nuages/).

Un nuage dessiné en direct (SVG + flou gaussien) coûte cher au navigateur :
le flou est recalculé à la taille d'affichage, et à chaque changement. Ces
images sont dessinées une fois pour toutes ; la page ne fait plus que les
déplacer, les agrandir et les estomper, ce que la carte graphique fait
sans rien redessiner.

Usage : python scripts/generer-nuages.py   (nécessite playwright et Pillow)
Les silhouettes sont celles de SILHOUETTES dans design-system/CloudLayer.tsx.
"""
import io, os
from PIL import Image
from playwright.sync_api import sync_playwright

SILHOUETTES = [
    ([(58, 60, 26), (92, 46, 32), (126, 56, 28), (152, 64, 20), (38, 68, 18)], (96, 70, 66, 14)),
    ([(64, 52, 28), (96, 36, 26), (124, 50, 26), (148, 62, 20), (40, 64, 18)], (96, 68, 62, 13)),
    ([(54, 64, 22), (86, 54, 28), (118, 52, 26), (148, 60, 24), (174, 68, 15)], (108, 71, 72, 12)),
    ([(78, 56, 26), (106, 44, 24), (132, 58, 22), (56, 66, 18)], (96, 68, 50, 12)),
]
FLOUS = [2.4, 3.5, 5, 7]
TEINTES = {
    "clair": ("#FDFDFE", "#E2E9F1", "#BCC9DA"),
    "sombre": ("#3B4D63", "#26344A", "#16202F"),
}
M = 30                      # marge pour que le flou ne soit jamais coupé
ECHELLE = 3                 # 260 × 160 unités → 780 × 480 pixels
SORTIE = os.path.join(os.path.dirname(__file__), "..", "public", "nuages")

def svg(forme, flou, teinte):
    lobes, base = SILHOUETTES[forme]
    light, mid, shade = TEINTES[teinte]
    formes = f'<ellipse cx="{base[0]}" cy="{base[1]}" rx="{base[2]}" ry="{base[3]}"/>' + "".join(
        f'<circle cx="{cx}" cy="{cy}" r="{r}"/>' for cx, cy, r in lobes)
    w, h = (200 + 2 * M) * ECHELLE, (100 + 2 * M) * ECHELLE
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{-M} {-M} {200 + 2 * M} {100 + 2 * M}" width="{w}" height="{h}">'
            f'<defs><linearGradient id="f" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="{light}"/>'
            f'<stop offset="46%" stop-color="{light}"/><stop offset="74%" stop-color="{mid}"/><stop offset="100%" stop-color="{shade}"/>'
            f'</linearGradient><filter id="s" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="{flou}"/></filter></defs>'
            f'<g filter="url(#s)" fill="url(#f)">{formes}</g></svg>'), w, h

os.makedirs(SORTIE, exist_ok=True)
with sync_playwright() as pw:
    b = pw.chromium.launch(executable_path=os.environ.get("CHROMIUM", "/opt/pw-browsers/chromium"))
    p = b.new_page()
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
    b.close()
print(f"{len(TEINTES) * len(SILHOUETTES) * len(FLOUS)} images, {total // 1024} Ko au total")
