// Fabrique le bail (9 pages A4) : l'image de chaque page vierge + le texte et les croix.
// Tout est synchrone une fois les images chargées : indispensable pour le menu Partager d'iOS.
import { BAILLEUR, CLAUSES } from "./config.js";
import { CASES, CASES_COMMUNES, EFFACER, LIGNES, LOCATAIRE, PARAPHE, PARAPHES, SIGNATURE, TRAITS } from "./gabarit.js";
import { montantEnLettres } from "./montant.js";

export const NB_PAGES = 9;
const MM_PAR_PX = 210 / 1654;
const mm = (px) => px * MM_PAR_PX;
const ENCRE = [0, 0, 0];
const TAILLE = 11, TAILLE_MIN = 6.5;
const TAILLE_IMPRIME = 9.75; // taille du texte imprimé sur le modèle

export const URL_SIGNATURE = "assets/signature.png";
export const URL_PARAPHE = "assets/paraphe.png";

let images = null, signature = null, paraphe = null, rapportParaphe = 1;
let journal = []; // ce qui est posé sur les pages : l'aperçu le redessine à l'identique

async function octets(url) {
  const rep = await fetch(url);
  if (!rep.ok) throw new Error(`${url} : ${rep.status}`);
  return new Uint8Array(await rep.arrayBuffer());
}

/** Largeur et hauteur d'un PNG, lues dans son en-tête. */
function taillePNG(o) {
  const v = new DataView(o.buffer, o.byteOffset);
  return { l: v.getUint32(16), h: v.getUint32(20) };
}

export async function chargerPages() {
  [images, signature, paraphe] = await Promise.all([
    Promise.all(Array.from({ length: NB_PAGES }, (_, i) => octets(`assets/pages/page${i + 1}.jpg`))),
    octets(URL_SIGNATURE),
    octets(URL_PARAPHE),
  ]);
  const t = taillePNG(paraphe);
  rapportParaphe = t.h / t.l;
}

/** La police du PDF ne connaît que l'alphabet latin courant : le reste perd ses accents. */
const WINANSI_EN_PLUS = "€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ";
export function textePDF(s) {
  return Array.from(String(s ?? "").replace(/[   ]/g, " ").replace(/’/g, "'").normalize("NFC"))
    .map((c) => {
      const code = c.codePointAt(0);
      if (code < 256 || WINANSI_EN_PLUS.includes(c)) return c;
      const sans = c.normalize("NFD").replace(/[̀-ͯ]/g, "");
      if (sans !== c && sans.codePointAt(0) < 256) return sans;
      return { "ł": "l", "Ł": "L", "ø": "o", "Ø": "O", "đ": "d", "Đ": "D", "ß": "ss" }[c] || "?";
    }).join("");
}

export function dateFr(iso) {
  const [a, m, j] = String(iso).slice(0, 10).split("-");
  return `${j}/${m}/${a}`;
}

/** 410 → « 410 » ; 410.5 → « 410,50 » */
export function montantCourt(n) {
  const c = Math.round(n * 100);
  const ent = String(Math.floor(c / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return c % 100 ? `${ent},${String(c % 100).padStart(2, "0")}` : ent;
}

/** Retire les pointillés sous le texte. */
function gommer(doc, l, largeurMm) {
  doc.setFillColor(255, 255, 255);
  rectBlanc(doc, l.p, mm(l.x) - 0.5, mm(l.y - 8), largeurMm + 1, mm(12));
}

function rectBlanc(doc, p, x, y, l, h) {
  doc.rect(x, y, l, h, "F");
  journal.push({ k: "r", p, x, y, l, h });
}

function poserTexte(doc, p, t, x, y) {
  doc.text(t, x, y);
  journal.push({ k: "t", p, t, x, y, z: doc.getFontSize() });
}

function ligne(doc, p, x0, y0, x1, y1, e) {
  doc.line(x0, y0, x1, y1);
  journal.push({ k: "l", p, x0, y0, x1, y1, e });
}

function image(doc, p, octetsImg, url, x, y, l, h) {
  doc.setPage(p);
  doc.addImage(octetsImg, "PNG", x, y, l, h, url, "SLOW");
  journal.push({ k: "i", p, url, x, y, l, h });
}

/** La couleur et l'épaisseur du trait ne valent que pour la page en cours : on les remet à chaque fois. */
function plume(doc, p, epaisseur) {
  doc.setPage(p);
  doc.setDrawColor(...ENCRE);
  doc.setLineWidth(epaisseur);
}

function ecrire(doc, l, texte, taille = TAILLE) {
  const t = textePDF(texte);
  if (!t) return;
  doc.setPage(l.p);
  const dispo = mm(l.xmax - l.x);
  let z = taille;
  doc.setFontSize(z);
  while (doc.getTextWidth(t) > dispo && z > TAILLE_MIN) { z -= 0.25; doc.setFontSize(z); }
  gommer(doc, l, doc.getTextWidth(t));
  poserTexte(doc, l.p, t, mm(l.x), mm(l.y - 4));
}

/** Répartit un texte sur plusieurs lignes pointillées, en réduisant la police si besoin. */
function ecrireBloc(doc, lignes, texte) {
  const t = textePDF(texte);
  if (!t) return;
  const dispo = mm(lignes[0].xmax - lignes[0].x);
  let z = TAILLE, morceaux;
  for (;;) {
    doc.setFontSize(z);
    morceaux = doc.splitTextToSize(t, dispo);
    if (morceaux.length <= lignes.length || z <= TAILLE_MIN) break;
    z -= 0.25;
  }
  // Sur une seule ligne : celle du bas, pour ne pas coller au libellé imprimé au-dessus.
  const garde = morceaux.slice(0, lignes.length);
  garde.forEach((m, i) => {
    const l = lignes[i + lignes.length - garde.length];
    doc.setPage(l.p);
    gommer(doc, l, doc.getTextWidth(m));
    poserTexte(doc, l.p, m, mm(l.x), mm(l.y - 4));
  });
}

/** Le bloc locataire, écrit comme le texte imprimé ; une seule taille pour les quatre lignes. */
function ecrireLocataire(doc, lignes) {
  const { p, xTiret, xTexte, xmax, y } = LOCATAIRE;
  const textes = lignes.map(textePDF);
  const dispo = mm(xmax - xTexte);
  doc.setPage(p);
  let z = TAILLE_IMPRIME;
  doc.setFontSize(z);
  while (Math.max(...textes.map((t) => doc.getTextWidth(t))) > dispo && z > TAILLE_MIN) {
    z -= 0.25;
    doc.setFontSize(z);
  }
  textes.forEach((t, i) => {
    poserTexte(doc, p, "-", mm(xTiret), mm(y[i]));
    poserTexte(doc, p, t, mm(xTexte), mm(y[i]));
  });
}

function cocher(doc, nom) {
  const c = CASES[nom];
  if (!c) throw new Error("case inconnue : " + nom);
  const [p, x, y, w, h] = c;
  plume(doc, p, 0.5);
  ligne(doc, p, mm(x + 4), mm(y + 4), mm(x + w - 4), mm(y + h - 4), 0.5);
  ligne(doc, p, mm(x + w - 4), mm(y + 4), mm(x + 4), mm(y + h - 4), 0.5);
}

function effacer(doc, [p, x, y, w, h]) {
  doc.setPage(p);
  doc.setFillColor(255, 255, 255);
  rectBlanc(doc, p, mm(x), mm(y), mm(w), mm(h));
}

/** Identifiant de nom de fichier : sans accents ni caractères spéciaux. */
function propre(s) {
  return String(s).normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

export function nomFichier(b) {
  return `Bail_${b.code}_${propre(b.prenom)}_${propre(b.nom)}.pdf`;
}

/** b : { code, logement, prenom, nom, dateNaissance, lieuNaissance, telephone, email, garantNom, garantAdresse, dateEffet, duree, cave, loyer, charges, dateSignature } */
export function construirePDF(b) {
  if (!images) throw new Error("pages non chargées");
  journal = [];
  const { jsPDF } = globalThis.jspdf;
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
  doc.setDocumentProperties({ title: `Bail — ${textePDF(b.prenom)} ${textePDF(b.nom)}`, author: BAILLEUR.denomination });

  images.forEach((img, i) => {
    if (i) doc.addPage("a4");
    doc.addImage(img, "JPEG", 0, 0, 210, 297, `page${i + 1}`, "NONE");
  });
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...ENCRE);

  const a = b.logement, total = b.loyer + b.charges;
  const nomComplet = `${b.prenom} ${b.nom.toLocaleUpperCase("fr")}`;

  // Bailleur
  ecrire(doc, LIGNES.bailleurNom, BAILLEUR.nomPrenom);
  ecrire(doc, LIGNES.denomination, BAILLEUR.denomination);
  ecrire(doc, LIGNES.domicile, BAILLEUR.domicile);
  ecrire(doc, LIGNES.adresse, BAILLEUR.adresse);
  ecrire(doc, LIGNES.email, BAILLEUR.email);

  // Locataire et garant
  ecrireLocataire(doc, [
    `Nom et prénom du locataire : ${nomComplet}`,
    `Date et lieu de naissance : ${b.dateNaissance} à ${b.lieuNaissance}`,
    `Téléphone : ${b.telephone}`,
    `Adresse e-mail : ${b.email}`,
  ]);
  if (b.garantNom) ecrireBloc(doc, LIGNES.garant, `${b.garantNom} — ${b.garantAdresse}`);

  // Logement
  a.localisation.forEach((t, i) => ecrire(doc, LIGNES.localisation[i], t, 12));
  ecrire(doc, LIGNES.surface, a.surface);
  ecrire(doc, LIGNES.pieces, a.pieces);
  ecrire(doc, LIGNES.autresTexte, a.autresTexte);
  a.equipements.forEach((t, i) => ecrire(doc, LIGNES.equipements[i], t));
  ecrire(doc, LIGNES.internet, CLAUSES.internet);
  [...CASES_COMMUNES,
    `habitat.${a.habitat}`, `regime.${a.regime}`, `periode.${a.periode}`,
    `chauffage.${a.chauffage}`, `eau.${a.eauChaude}`,
    ...a.autresParties.map((x) => `partie.${x}`),
    ...a.privatif.map((x) => `privatif.${x}`),
    ...a.commun.map((x) => `commun.${x}`),
  ].forEach((c) => cocher(doc, c));

  if (b.cave) { effacer(doc, EFFACER.cave); ecrire(doc, LIGNES.cave, b.cave); }

  // Durée
  effacer(doc, EFFACER.dateEffet);
  ecrire(doc, LIGNES.dateEffet, dateFr(b.dateEffet));
  ecrire(doc, LIGNES.duree, b.duree);

  // Argent
  const L_ = montantCourt(b.loyer), C_ = montantCourt(b.charges), T_ = montantCourt(total);
  ecrire(doc, LIGNES.loyerResume, `${L_} € + ${C_} € de charges = ${T_} €`, 12);
  ecrire(doc, LIGNES.loyerFixe, `${L_} € (${montantEnLettres(b.loyer)})`, 12);
  ecrire(doc, LIGNES.loyerTotal, `+ ${C_} € = ${T_} € (${montantEnLettres(total)})`, 12);
  ecrire(doc, LIGNES.loyerMensuel, L_, 12);
  ecrire(doc, LIGNES.revision, CLAUSES.revision);
  ecrire(doc, LIGNES.irl, CLAUSES.irl);
  ecrire(doc, LIGNES.forfaitMontant, `${C_} € (${montantEnLettres(b.charges)})`);
  ecrire(doc, LIGNES.forfaitRevision, CLAUSES.revisionForfait);
  ecrire(doc, LIGNES.periodicite, CLAUSES.periodicite);
  ecrire(doc, LIGNES.paiement, CLAUSES.paiement);
  ecrire(doc, LIGNES.loyerHC, `${L_} €`);
  ecrire(doc, LIGNES.chargesEch, `${C_} € soit un total de ${T_} €`);

  ecrire(doc, LIGNES.depot, CLAUSES.depot);
  CLAUSES.conditions.forEach((t, i) => ecrire(doc, LIGNES.conditions[i], t));
  ecrire(doc, LIGNES.dateSignature, dateFr(b.dateSignature));
  ecrire(doc, LIGNES.lieuSignature, CLAUSES.lieuSignature);

  TRAITS.forEach(([p, x0, y0, x1, y1]) => {
    plume(doc, p, 0.35);
    ligne(doc, p, mm(x0), mm(y0), mm(x1), mm(y1), 0.35);
  });

  // Paraphes sur chaque page, signature du bailleur à la fin
  Object.entries(PARAPHES).forEach(([p, y]) => {
    image(doc, Number(p), paraphe, URL_PARAPHE, mm(PARAPHE.x), mm(y), mm(PARAPHE.largeur), mm(PARAPHE.largeur * rapportParaphe));
  });
  image(doc, SIGNATURE.p, signature, URL_SIGNATURE, mm(SIGNATURE.x), mm(SIGNATURE.y), mm(SIGNATURE.largeur), mm(SIGNATURE.hauteur));
  return doc;
}

export function genererFichier(b) {
  const blob = construirePDF(b).output("blob");
  const nom = nomFichier(b);
  return { blob, nom, fichier: new File([blob], nom, { type: "application/pdf" }), journal };
}
