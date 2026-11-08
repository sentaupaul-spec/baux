// Positions sur les 9 pages du bail, en pixels de l'image (1654 × 2339, A4 à 200 dpi).
// Mesurées sur assets/pages/ : à refaire seulement si ces images changent.

// Une ligne de texte : page, x de départ, y du pointillé, x maximum.
const L = (p, x, y, xmax = 1490) => ({ p, x, y, xmax });

// Bloc locataire (page 2) : le modèle est vierge à cet endroit, tout est écrit à la taille du texte imprimé.
export const LOCATAIRE = { p: 2, xTiret: 151, xTexte: 198, xmax: 1490, y: [509, 543, 577, 611] };

export const LIGNES = {
  bailleurNom: L(1, 225, 1254),
  denomination: L(1, 225, 1349),
  domicile: [L(1, 225, 1476), L(1, 225, 1507)],
  adresse: L(1, 225, 1602),
  email: L(1, 225, 1667),

  garant: [L(2, 210, 446, 1480), L(2, 210, 477, 1480)],
  localisation: [L(2, 115, 1243, 1480), L(2, 115, 1336, 1480)],
  surface: L(2, 445, 1722, 522),
  pieces: L(2, 590, 1786, 660),
  autresTexte: L(2, 680, 1912, 1480),

  equipements: [L(3, 110, 190, 1480), L(3, 110, 222, 1480)],
  cave: L(3, 250, 550, 345),
  dateEffet: L(3, 598, 1246, 800),
  duree: L(3, 215, 1338, 1480),
  loyerResume: L(3, 360, 1851, 1480),
  loyerFixe: L(3, 440, 1914, 1480),
  loyerTotal: L(3, 440, 1970, 1480),

  loyerMensuel: L(4, 500, 157, 1130),
  revision: L(4, 360, 1063, 680),
  irl: L(4, 640, 1127, 950),
  forfaitMontant: L(4, 115, 1565, 1480),
  forfaitRevision: L(4, 115, 1721, 1480),

  periodicite: L(5, 460, 968, 680),
  jourPaiement: L(5, 500, 1034, 665),
  lieuPaiement: L(5, 925, 1034, 1490),
  loyerHC: L(5, 440, 1160, 665),
  chargesEch: L(5, 1000, 1160, 1490),

  depot: L(6, 115, 1224, 1480),

  conditions: [L(8, 115, 1195, 1470), L(8, 115, 1257, 1470), L(8, 115, 1319, 1470)],

  dateSignature: L(9, 240, 665, 490),
  lieuSignature: L(9, 640, 665, 1150),
};

// Cases : page, x, y, largeur, hauteur.
export const CASES = {
  "bailleur.morale": [1, 798, 1133, 35, 34],
  "societe-familiale.oui": [1, 167, 1381, 35, 33],
  "mandataire.non": [1, 819, 1767, 35, 33],

  "habitat.collectif": [2, 537, 1403, 35, 34],
  "habitat.individuel": [2, 715, 1400, 36, 33],
  "regime.monopropriete": [2, 613, 1496, 35, 33],
  "regime.copropriete": [2, 876, 1502, 35, 33],
  "periode.avant-1949": [2, 510, 1559, 36, 33],
  "periode.1949-1974": [2, 708, 1561, 35, 33],
  "periode.1975-1989": [2, 970, 1564, 35, 34],
  "periode.1989-2005": [2, 105, 1618, 35, 34],
  "periode.depuis-2005": [2, 381, 1620, 35, 34],
  "partie.grenier": [2, 551, 1820, 35, 34],
  "partie.comble": [2, 716, 1820, 36, 33],
  "partie.terrasse": [2, 885, 1819, 36, 34],
  "partie.balcon": [2, 1055, 1817, 36, 33],
  "partie.loggia": [2, 126, 1891, 35, 34],
  "partie.jardin": [2, 351, 1889, 36, 33],
  "partie.autres": [2, 535, 1889, 36, 33],

  "chauffage.individuel": [3, 743, 259, 36, 33],
  "chauffage.collectif": [3, 968, 258, 35, 34],
  "eau.individuel": [3, 743, 319, 36, 34],
  "eau.collectif": [3, 963, 319, 35, 33],
  "usage.habitation": [3, 496, 416, 36, 34],
  "privatif.cave": [3, 102, 523, 36, 33],
  "privatif.parking": [3, 379, 519, 36, 34],
  "privatif.garage": [3, 643, 517, 36, 34],
  "privatif.autres": [3, 937, 523, 35, 33],
  "commun.velo": [3, 103, 653, 35, 34],
  "commun.ascenseur": [3, 372, 652, 36, 34],
  "commun.espaces-verts": [3, 640, 653, 36, 33],
  "commun.jeux": [3, 934, 652, 36, 33],
  "commun.laverie": [3, 102, 702, 35, 33],
  "commun.poubelle": [3, 373, 700, 37, 33],
  "commun.gardiennage": [3, 640, 700, 36, 33],
  "commun.autres": [3, 936, 703, 36, 33],

  "relocation.oui": [4, 596, 290, 36, 33],
  "reference.non": [4, 327, 386, 35, 34],
  "charges.forfait": [4, 106, 1351, 33, 32],

  "assurance.non": [5, 499, 541, 35, 34],
  "paiement.echoir": [5, 843, 949, 35, 32],
};

// Cases cochées pour tous les logements (reprises du bail pré-rempli).
export const CASES_COMMUNES = [
  "bailleur.morale", "societe-familiale.oui", "mandataire.non", "usage.habitation",
  "relocation.oui", "reference.non", "assurance.non", "paiement.echoir",
];

// Rubriques sans objet, barrées comme sur le bail pré-rempli : page, x0, y0, x1, y1.
// Les annexes (XI) ne sont volontairement pas barrées.
export const TRAITS = [
  [1, 720, 1928, 800, 1880], [1, 715, 2023, 800, 1975],
  [4, 560, 760, 700, 710], [4, 560, 947, 700, 897],
  [5, 560, 322, 680, 272], [5, 560, 478, 680, 428], [5, 550, 728, 640, 680], [5, 560, 822, 640, 790],
  [5, 730, 1258, 800, 1225], [5, 1090, 1322, 1160, 1290], [5, 780, 1540, 850, 1510], [5, 655, 1664, 735, 1632],
  [5, 790, 1152, 950, 1152], // « récupérables » : charges au forfait
  [6, 750, 388, 905, 310], [6, 645, 670, 820, 570], [6, 610, 966, 820, 860],
  [7, 1005, 1195, 580, 1575], [7, 760, 1772, 850, 1695], [7, 395, 1830, 470, 1790],
  [8, 600, 290, 740, 240], [8, 625, 478, 760, 428], [8, 640, 634, 780, 584], [8, 670, 885, 810, 835], [8, 675, 1072, 830, 1022],
];

// Paraphe à droite du mot « Paraphes » : page → y du haut de l'image.
export const PARAPHES = { 1: 2121, 2: 2083, 3: 2083, 4: 2084, 5: 2084, 6: 2082, 7: 2084, 8: 2083, 9: 2086 };
export const PARAPHE = { x: 1195, largeur: 170 };
export const SIGNATURE = { p: 9, x: 105, y: 785, largeur: 472, hauteur: 304 };

// Pointillés à effacer avant d'écrire : page, x, y, largeur, hauteur.
export const EFFACER = {
  dateEffet: [3, 592, 1226, 104, 26],
  cave: [3, 247, 538, 34, 16],
};
