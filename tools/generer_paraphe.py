#!/usr/bin/env python3
"""Extrait le paraphe d'Annie du bail pré-rempli : encre noire sur fond transparent.

Usage : .venv/bin/python tools/generer_paraphe.py "<scan de la page 3 du bail pré-rempli>"
Écrit assets/paraphe.png.
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image

SORTIE = Path(__file__).resolve().parent.parent / "assets" / "paraphe.png"
ZOOM = 3

im = Image.open(sys.argv[1]).convert("RGB")
w, h = im.size
im = im.crop((int(w * 0.55), int(h * 0.91), w, h))
im = im.resize((im.width * ZOOM, im.height * ZOOM), Image.LANCZOS)
rouge = np.asarray(im, dtype=np.float32)[:, :, 0]  # l'encre bleue est sombre dans le canal rouge
alpha = np.clip((225 - rouge) / (225 - 130), 0, 1) * 255
alpha[alpha < 40] = 0
lignes, colonnes = np.where(alpha > 0)
m = 6
y0, y1 = max(lignes.min() - m, 0), lignes.max() + m
x0, x1 = max(colonnes.min() - m, 0), colonnes.max() + m
a = alpha[y0:y1, x0:x1].astype(np.uint8)
Image.fromarray(np.dstack([np.zeros_like(a), a]), "LA").save(SORTIE, optimize=True)
print(SORTIE.name, a.shape[1], "x", a.shape[0], SORTIE.stat().st_size // 1024, "Ko")
