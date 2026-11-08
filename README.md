# Baux — SCI CBI Annie Cresp

Application web (PWA) pour iPad : Annie choisit l'appartement, remplit le locataire et les dates, relit l'aperçu, puis enregistre
le bail en PDF (9 pages, écrit en noir, avec sa signature et ses paraphes). Tout est statique, sans serveur ni compte. **Aucune donnée n'est conservée ni envoyée** :
le PDF est fabriqué sur l'appareil.

## Accès : un simple lien, rien à gérer

Annie clique sur le lien, on ajoute le raccourci sur l'écran d'accueil de son iPad (Safari → Partager → « Sur l'écran
d'accueil »), et c'est tout. Pas de compte, pas d'installation, pas de mise à jour à faire : les nouvelles versions
arrivent toutes seules, et l'app marche aussi sans internet une fois ouverte.

Parcours : choisir l'appartement → remplir → **aperçu des 9 pages** → « Enregistrer le bail » (ou « Corriger »).

## Modifier un appartement

Tout est dans `js/config.js` : ce qui est identique aux trois dans `COMMUN_AUX_APPARTEMENTS`, le reste (adresse, étage, surface, pièces, chambres, loyer) dans le bloc de chaque logement. Une valeur mise dans un bloc remplace celle du commun.

## Organisation

```
js/config.js     ⭐ bailleur, clauses, logements, version
js/gabarit.js    positions des textes, cases et traits (pixels de assets/pages/, 1654 × 2339)
js/pdf.js        fabrication du PDF (jsPDF, synchrone)
js/app.js        écran unique
js/apercu.js     aperçu : redessine à l'écran ce qui est posé dans le PDF
assets/signature.png, assets/paraphe.png   signature et paraphe d'Annie
assets/pages/    les 9 pages vierges nettoyées
tools/preparer_pages.py   regénère assets/pages/ depuis les scans (fond blanc, essais de frappe retirés)
```

Les rubriques sans objet sont barrées comme sur le bail pré-rempli (`TRAITS`), sauf les annexes (XI), laissées intactes.

Sur iPad, « Télécharger » ouvre le menu d'iOS (« Enregistrer dans Fichiers ») ; ailleurs, le fichier est téléchargé.

## Tests

```bash
python3 -m venv .venv && .venv/bin/pip install pillow numpy opencv-python-headless pymupdf playwright pytest
.venv/bin/python -m playwright install chromium
.venv/bin/python -m pytest -q
```

Les PDF et les rendus sont écrits dans `tests/_sortie/`. Après une modification publiée, incrémenter `APP_VERSION`,
et ajouter tout nouveau fichier à `FICHIERS` dans `sw.js`.
