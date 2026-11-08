// ============================================================
//  Données fixes des baux — LE SEUL FICHIER À MODIFIER
//  pour changer le bailleur, les clauses ou ajouter un logement.
// ============================================================

export const APP_VERSION = "1.3.0";

export const BAILLEUR = {
  nomPrenom: "CRESP Annie",
  denomination: "SCI CBI",
  domicile: ["60 rue Dora Maar", "34070 Montpellier"],
  adresse: "Idem",
  email: "locationslogements34@gmail.com",
};

// Clauses identiques pour tous les logements (reprises du bail pré-rempli).
export const CLAUSES = {
  revision: "1er septembre",
  irl: "1er trimestre",
  revisionForfait: "Réactualisé avec le loyer",
  periodicite: "mensuel",
  jourPaiement: "1er",
  lieuPaiement: "par virement bancaire",
  depot: "Dépôt d'1 mois de loyer (encaissé)",
  conditions: ["Toutes fêtes interdites", "Respecter les voisins", "Tenir propre l'appartement"],
  lieuSignature: "Montpellier",
};

// Le code (MD1…) est interne : visible dans l'app et le nom du fichier, jamais dans le bail.
// Ce qui est identique dans les trois appartements.
const COMMUN_AUX_APPARTEMENTS = {
  pret: true,
  habitat: "collectif",        // collectif | individuel
  regime: "copropriete",       // monopropriete | copropriete
  periode: "1975-1989",        // avant-1949 | 1949-1974 | 1975-1989 | 1989-2005 | depuis-2005
  autresParties: ["balcon", "autres"], // grenier comble terrasse balcon loggia jardin autres
  autresTexte: "Cellier privé",
  chauffage: "collectif",      // individuel | collectif
  eauChaude: "individuel",     // individuel | collectif
  privatif: ["cave"],          // cave parking garage autres
  commun: ["velo", "espaces-verts", "poubelle", "gardiennage"], // velo ascenseur espaces-verts jeux laverie poubelle gardiennage autres
  charges: 70,
};

const equipements = (chambres) => [
  `Cuisine équipée ainsi que séjour + ${chambres} chambres meublées`,
  "(lit - armoire - table de chevet - bureau - étagères + lampes)",
];

export const LOGEMENTS = {
  MD1: {
    ...COMMUN_AUX_APPARTEMENTS,
    adresseCourte: "9 rue Jean de Montlaur",
    localisation: ["9 rue Jean de Montlaur", "4e étage — 34070 Montpellier"],
    surface: "60",
    pieces: "3",
    equipements: equipements(2),
    loyer: 410,
  },
  MD2: {
    ...COMMUN_AUX_APPARTEMENTS,
    adresseCourte: "11 rue Guillaume d'Autignac",
    localisation: ["11 rue Guillaume d'Autignac — Bâtiment C9", "2e étage — 34070 Montpellier"],
    surface: "72",
    pieces: "4",
    equipements: equipements(3),
    loyer: 380,
  },
  MD3: {
    ...COMMUN_AUX_APPARTEMENTS,
    adresseCourte: "10 rue Jean Raimond de Comminges",
    localisation: ["10 rue Jean Raimond de Comminges", "4e étage — 34070 Montpellier"],
    surface: "72",
    pieces: "4",
    equipements: equipements(3),
    loyer: 410,
  },
};
