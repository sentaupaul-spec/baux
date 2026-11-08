#!/usr/bin/env python3
"""Génère les icônes d'écran d'accueil (180, 192, 512 px)."""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ICONES = Path(__file__).resolve().parent.parent / "icons"
ICONES.mkdir(exist_ok=True)
T = 512
img = Image.new("RGB", (T, T), "#2e7a3d")
d = ImageDraw.Draw(img)
d.rounded_rectangle((116, 62, 396, 450), radius=26, fill="white")
police = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 92)
d.text((T / 2, 170), "BAIL", font=police, fill="#1e3a5f", anchor="mm")
for y in (262, 310, 358):
    d.rounded_rectangle((162, y, 350, y + 16), radius=8, fill="#b9b4a8")
for nom, taille in (("apple-touch-icon.png", 180), ("icon-192.png", 192), ("icon-512.png", 512)):
    img.resize((taille, taille), Image.LANCZOS).save(ICONES / nom, optimize=True)
