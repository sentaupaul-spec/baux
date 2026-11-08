#!/usr/bin/env python3
"""Prépare les 9 pages du bail vierge : A4 200 dpi, fond blanc, essais de frappe retirés.

Usage : .venv/bin/python tools/preparer_pages.py "<…>/Base Baux/bail vierge coloc bis/bail vierge 1"
Écrit assets/pages/page1.jpg … page9.jpg (niveaux de gris).
"""
import io
import math
import sys
from pathlib import Path

import fitz
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

LARGEUR, HAUTEUR = 1654, 2339  # A4 à 200 dpi
RACINE = Path(__file__).resolve().parent.parent
SORTIE = RACINE / "assets" / "pages"

# Zones à effacer, en pixels de la page finale : (page, x0, y0, x1, y1, décalage_x).
# décalage_x : on recopie les points de suite voisins (décalés d'autant) à la place de l'essai.
# 0 = on peint simplement en blanc.
ESSAIS = [
    (1, 60, 70, 1600, 205, 0),       # encadré publicitaire « NOUVEAU LOCATAIRE »
    (3, 90, 958, 1500, 1034, 0),     # encart publicitaire « Forfait Box Internet »
    (5, 492, 1004, 1510, 1041, 0),   # pointillés et « Lieu de paiement » : une seule mention écrite par js/pdf.js
    (5, 786, 1128, 800, 1168, 167),  # les deux-points, ramenés juste après « Charges »
    (5, 800, 1128, 1000, 1168, 0),   # « récupérables » et le début des pointillés
    (8, 100, 1305, 1500, 1360, 0),   # X. Autres conditions : les deux dernières lignes de pointillés
    (9, 142, 640, 222, 680, 0),      # « [date] »
    (9, 530, 640, 598, 680, 0),      # « [lieu] »
    (2, 214, 134, 276, 165, 137),    # « 442 »
    (2, 785, 224, 884, 262, 137),    # « fdgfh,g »
    (2, 284, 512, 344, 546, 137),    # « dffff »
    (3, 590, 868, 820, 903, 272),    # « jhimjouiyhutgoiy »
    (4, 826, 1095, 902, 1131, -186), # « Texte »
    (3, 1160, 2125, 1560, 2265, 0),  # signature restée dans les paraphes
    (3, 1145, 2172, 1160, 2265, 0),
    (2, 140, 484, 1500, 580, 0),     # bloc locataire : réécrit en entier par js/pdf.js (LOCATAIRE)
]

# Morceaux à déplacer : (page, x0, y0, x1, y1, décalage_x, décalage_y).
DEPLACEMENTS = [
    (2, 100, 608, 1500, 644, 0, 34),      # « Désigné (s) ci-après le locataire », sous le bloc locataire agrandi
    (8, 100, 1278, 1500, 1293, 0, 43),    # X. Autres conditions : 4 lignes espacées au lieu de 6 serrées
    (8, 100, 1247, 1500, 1262, 0, 28),
    (8, 100, 1216, 1500, 1231, 0, 13),
]

# Texte imprimé du modèle à remplacer :
# (page, (x0, y0, x1, y1) à blanchir, [(x, ligne de base, texte), …], soulignement pointillé, gras).
POLICE = "/System/Library/Fonts/Supplemental/Arial.ttf"
POLICE_GRAS = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"
TAILLE_PX = 27.3  # taille mesurée sur le scan
REECRITURES = [
    (6, (190, 1907, 1500, 1970), [  # clause résolutoire : défaut de paiement
        (194, 1929, "en cas de défaut de paiement du loyer toutes charges comprises, des provisions de charge, ou de la"),
        (199, 1960, "régularisation annuelle de charge"),
    ], True, False),
    (6, (90, 1100, 1500, 1170), [  # VI. Garanties : le libellé réduit à l'essentiel
        (104, 1127, "Montant du dépôt de garantie de l'exécution des obligations du locataire :"),
    ], False, False),
    (9, (845, 700, 1500, 738), [  # signature : le cautionneur signe aussi
        (855, 727, "Signature du locataire et du cautionneur"),
    ], False, True),
]


def charger(dossier: Path, n: int) -> Image.Image:
    candidats = [p for p in dossier.iterdir() if f"{n}:9" in p.name and not p.name.startswith(".")]
    if len(candidats) != 1:
        raise SystemExit(f"page {n} : {len(candidats)} fichiers trouvés")
    p = candidats[0]
    if p.suffix.lower() == ".pdf":
        doc = fitz.open(p)
        pix = doc[0].get_pixmap(dpi=200)
        return Image.open(io.BytesIO(pix.tobytes("png"))).convert("RGB")
    return Image.open(p).convert("RGB")


def blanchir(img: Image.Image) -> np.ndarray:
    """Le scan a un fond cyan : le canal le plus clair le ramène vers le blanc."""
    a = np.asarray(img, dtype=np.float32)
    g = a.max(axis=2)
    noir, blanc = 45.0, 236.0
    g = np.clip((g - noir) / (blanc - noir), 0, 1) * 255
    return g.astype(np.uint8)


def sur_a4(g: np.ndarray) -> np.ndarray:
    img = Image.fromarray(g)
    echelle = min(LARGEUR / img.width, HAUTEUR / img.height)
    l, h = round(img.width * echelle), round(img.height * echelle)
    img = img.resize((l, h), Image.LANCZOS)
    page = Image.new("L", (LARGEUR, HAUTEUR), 255)
    page.paste(img, ((LARGEUR - l) // 2, (HAUTEUR - h) // 2))
    return np.asarray(page).copy()


def effacer(page: np.ndarray, n: int) -> None:
    for p, x0, y0, x1, y1, dx in ESSAIS:
        if p != n:
            continue
        if dx:
            page[y0:y1, x0:x1] = page[y0:y1, x0 + dx:x1 + dx]
        else:
            page[y0:y1, x0:x1] = 255
    for p, x0, y0, x1, y1, dx, dy in DEPLACEMENTS:
        if p != n:
            continue
        morceau = page[y0:y1, x0:x1].copy()
        page[y0:y1, x0:x1] = 255
        page[y0 + dy:y1 + dy, x0 + dx:x1 + dx] = morceau
    for p, (x0, y0, x1, y1), lignes, souligne, gras in REECRITURES:
        if p != n:
            continue
        page[y0:y1, x0:x1] = 255
        for x, base, texte in lignes:
            imprimer(page, x, base, texte, souligne, gras)


def imprimer(page: np.ndarray, x: int, base: int, texte: str, souligne: bool, gras: bool) -> None:
    """Écrit une ligne comme sur le scan : Arial légèrement adouci, pointillés 4 px / 4 px en option."""
    zoom = 4
    police = ImageFont.truetype(POLICE_GRAS if gras else POLICE, round(TAILLE_PX * zoom))
    largeur, hauteur, ligne = math.ceil(police.getlength(texte) / zoom), 50, 36
    grand = Image.new("L", (largeur * zoom, hauteur * zoom), 255)
    ImageDraw.Draw(grand).text((0, ligne * zoom), texte, font=police, fill=0, anchor="ls")
    a = np.asarray(grand.resize((largeur, hauteur), Image.LANCZOS).filter(ImageFilter.GaussianBlur(0.5))).copy()
    if souligne:
        a[ligne + 2:ligne + 5, np.arange(largeur) % 8 < 4] = 0
    y = base - ligne
    page[y:y + hauteur, x:x + largeur] = np.minimum(page[y:y + hauteur, x:x + largeur], a)


def bords_blancs(page: np.ndarray) -> None:
    """Retire l'ombre des bords du scanner."""
    m = 26
    page[:m, :] = 255
    page[-m:, :] = 255
    page[:, :m] = 255
    page[:, -m:] = 255


def main() -> None:
    dossier = Path(sys.argv[1])
    SORTIE.mkdir(parents=True, exist_ok=True)
    total = 0
    for n in range(1, 10):
        page = sur_a4(blanchir(charger(dossier, n)))
        bords_blancs(page)
        effacer(page, n)
        f = SORTIE / f"page{n}.jpg"
        Image.fromarray(page).save(f, "JPEG", quality=72, optimize=True)
        total += f.stat().st_size
        print(f.name, f.stat().st_size // 1024, "Ko")
    print("total", total // 1024, "Ko")


if __name__ == "__main__":
    main()
