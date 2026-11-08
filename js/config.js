// ============================================================
//  Données fixes des baux — LE SEUL FICHIER À MODIFIER
//  pour changer le bailleur, les clauses ou ajouter un logement.
// ============================================================

export const APP_VERSION = "1.0.0";

export const BAILLEUR = {
  nomPrenom: "CRESP Annie",
  denomination: "SCI CBI",
  domicile: ["60 rue Dora Maar", "34070 Montpellier"],
  adresse: "Idem",
  email: "annie.cresp@wanadoo.fr",
};

// Clauses identiques pour tous les logements (reprises du bail pré-rempli).
export const CLAUSES = {
  revision: "1er septembre",
  irl: "1er trimestre",
  revisionForfait: "1er septembre de chaque année",
  periodicite: "mensuel",
  jourPaiement: "1er",
  lieuPaiement: "par virement bancaire",
  depot: "Dépôt d'1 mois de loyer (encaissé)",
  conditions: ["Toutes fêtes interdites", "Respecter les voisins", "Tenir propre l'appartement"],
  lieuSignature: "Montpellier",
};

// Le code (MD1…) est interne : visible dans l'app et le nom du fichier, jamais dans le bail.
// Pour activer MD1 ou MD3 : remplir les mêmes champs que MD2, puis mettre pret: true.
export const LOGEMENTS = {
  MD1: { pret: false, adresseCourte: "9 rue Jean de Montlaur" },
  MD2: {
    pret: true,
    adresseCourte: "11 rue Guillaume d'Autignac",
    localisation: ["11 rue Guillaume d'Autignac — Bâtiment C9", "2e étage — 34070 Montpellier"],
    habitat: "collectif",        // collectif | individuel
    regime: "copropriete",       // monopropriete | copropriete
    periode: "1975-1989",        // avant-1949 | 1949-1974 | 1975-1989 | 1989-2005 | depuis-2005
    surface: "71",
    pieces: "4",
    autresParties: ["balcon", "autres"], // grenier comble terrasse balcon loggia jardin autres
    autresTexte: "Cellier privé",
    equipements: [
      "Cuisine équipée ainsi que séjour + 3 chambres meublées",
      "(lit - armoire - table de chevet - bureau - étagères + lampes)",
    ],
    chauffage: "collectif",      // individuel | collectif
    eauChaude: "individuel",     // individuel | collectif
    privatif: ["cave"],          // cave parking garage autres
    commun: ["velo", "espaces-verts", "poubelle", "gardiennage"], // velo ascenseur espaces-verts jeux laverie poubelle gardiennage autres
    loyer: 410,
    charges: 70,
  },
  MD3: { pret: false, adresseCourte: "10 rue Jean Raimond de Comminges" },
};
