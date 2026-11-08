// Écran unique : choisir l'appartement, remplir, télécharger. Rien n'est conservé.
import { APP_VERSION, LOGEMENTS } from "./config.js";
import { formatEuros, formatSaisie, lireMontant } from "./montant.js";
import { afficherApercu, viderApercu } from "./apercu.js";
import { chargerPages, dateFr, genererFichier } from "./pdf.js";

const $ = (id) => document.getElementById(id);
let code = null;
let pret = null; // le bail affiché dans l'aperçu, prêt à enregistrer

const aujourdhui = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

function afficherAppartements() {
  $("choix-appart").replaceChildren(...Object.entries(LOGEMENTS).map(([k, l]) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "choix-btn";
    b.dataset.k = k;
    b.disabled = !l.pret;
    const tag = document.createElement("span");
    tag.className = "tag"; tag.dataset.k = k; tag.textContent = k;
    const txt = document.createElement("span");
    txt.className = "choix-texte"; txt.textContent = l.adresseCourte;
    if (!l.pret) {
      const s = document.createElement("span");
      s.className = "choix-statut"; s.textContent = "Pas encore disponible";
      txt.append(s);
    }
    b.append(tag, txt);
    b.onclick = () => choisir(k);
    return b;
  }));
}

function choisir(k) {
  code = k;
  document.querySelectorAll(".choix-btn").forEach((b) => {
    b.classList.toggle("choisi", b.dataset.k === k);
    b.setAttribute("aria-pressed", b.dataset.k === k ? "true" : "false");
  });
  $("c-loyer").value = formatSaisie(LOGEMENTS[k].loyer);
  $("c-charges").value = formatSaisie(LOGEMENTS[k].charges);
  $("formulaire").hidden = false;
  majTotal();
  majResume();
  message("", "");
  $("formulaire").scrollIntoView({ behavior: "smooth", block: "start" });
}

function majTotal() {
  const l = lireMontant($("c-loyer").value), c = lireMontant($("c-charges").value);
  $("c-total").textContent = l !== null && c !== null ? formatEuros(l + c) : "—";
}

const garantOui = () => $("garant-oui").classList.contains("choisi");
const dureeChoisie = () => document.querySelector("#duree .choisi").dataset.duree;

function groupeUnique(conteneur, apres) {
  conteneur.querySelectorAll("button").forEach((b) => {
    b.onclick = () => {
      conteneur.querySelectorAll("button").forEach((x) => {
        x.classList.toggle("choisi", x === b);
        x.setAttribute("aria-pressed", x === b ? "true" : "false");
      });
      if (apres) apres();
      majResume();
    };
  });
}

function majResume() {
  if (!code) return;
  const prenom = $("c-prenom").value.trim(), nom = $("c-nom").value.trim();
  const qui = [prenom, nom].filter(Boolean).join(" ") || "(locataire à remplir)";
  const entree = $("c-effet").value ? dateFr($("c-effet").value) : "(date à remplir)";
  $("resume").textContent = `${LOGEMENTS[code].adresseCourte} — ${qui} — entrée le ${entree}.`;
}

function message(type, texte, id = "message") {
  const m = $(id);
  m.className = "message " + type;
  m.textContent = texte;
}

function erreur(champ, texte) {
  document.querySelectorAll(".invalide").forEach((e) => e.classList.remove("invalide"));
  champ.classList.add("invalide");
  message("erreur", texte);
  champ.focus();
  champ.scrollIntoView({ behavior: "smooth", block: "center" });
  return null;
}

function lireFormulaire() {
  document.querySelectorAll(".invalide").forEach((e) => e.classList.remove("invalide"));
  const v = (id) => $(id).value.trim();
  if (!v("c-prenom")) return erreur($("c-prenom"), "Il manque le prénom du locataire.");
  if (!v("c-nom")) return erreur($("c-nom"), "Il manque le nom du locataire.");
  if (v("c-email") && !/^\S+@\S+\.\S+$/.test(v("c-email"))) return erreur($("c-email"), "L'adresse e-mail semble incomplète. Corrigez-la ou laissez la case vide.");
  if (garantOui() && !v("c-garant-nom")) return erreur($("c-garant-nom"), "Il manque le nom du garant.");
  if (garantOui() && !v("c-garant-adresse")) return erreur($("c-garant-adresse"), "Il manque l'adresse du garant.");
  if (!v("c-effet")) return erreur($("c-effet"), "Il manque la date d'entrée.");
  const loyer = lireMontant(v("c-loyer")), charges = lireMontant(v("c-charges"));
  if (loyer === null || loyer <= 0) return erreur($("c-loyer"), "Le loyer n'est pas lisible. Exemple : 410");
  if (charges === null || charges < 0) return erreur($("c-charges"), "Les charges ne sont pas lisibles. Exemple : 70");
  if (!v("c-signature")) return erreur($("c-signature"), "Il manque la date de signature.");
  return {
    code,
    logement: LOGEMENTS[code],
    prenom: v("c-prenom"),
    nom: v("c-nom"),
    email: v("c-email"),
    garantNom: garantOui() ? v("c-garant-nom") : "",
    garantAdresse: garantOui() ? v("c-garant-adresse") : "",
    dateEffet: v("c-effet"),
    duree: dureeChoisie(),
    cave: v("c-cave"),
    loyer,
    charges,
    dateSignature: v("c-signature"),
  };
}

const estIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent)
  || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

function peutPartager(fichier) {
  try { return !!(navigator.share && navigator.canShare && navigator.canShare({ files: [fichier] })); }
  catch (e) { return false; }
}

function telechargerBlob(blob, nom) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = nom; a.rel = "noopener";
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

function ouvrirApercu() {
  const b = lireFormulaire();
  if (!b) return;
  message("", "");
  try {
    pret = genererFichier(b);
  } catch (e) {
    console.error(e);
    message("erreur", "Le bail n'a pas pu être préparé. Fermez l'application, rouvrez-la et recommencez. Si cela continue, prévenez Paul.");
    return;
  }
  afficherApercu($("apercu-pages"), pret.journal);
  message("", "", "message-apercu");
  $("rappel").hidden = true;
  $("apercu").hidden = false;
  document.body.classList.add("apercu-ouvert");
  $("apercu-pages").scrollTop = 0;
  $("apercu-titre").focus({ preventScroll: true });
}

function fermerApercu() {
  $("apercu").hidden = true;
  document.body.classList.remove("apercu-ouvert");
  viderApercu($("apercu-pages"));
  pret = null;
}

function enregistrer() {
  if (!pret) return;
  const fait = () => {
    message("ok", "C'est fait : le bail est enregistré.", "message-apercu");
    $("rappel").hidden = false;
  };
  if (estIOS() && peutPartager(pret.fichier)) { // à appeler dans le geste : iOS l'exige
    message("info", "Dans le menu qui s'ouvre, touchez « Enregistrer dans Fichiers ».", "message-apercu");
    navigator.share({ files: [pret.fichier] })
      .then(fait)
      .catch((e) => message("info", e && e.name === "AbortError"
        ? "Rien n'a été enregistré. Touchez à nouveau « Enregistrer le bail » pour recommencer."
        : "Le menu n'a pas pu s'ouvrir. Touchez à nouveau « Enregistrer le bail ».", "message-apercu"));
    return;
  }
  telechargerBlob(pret.blob, pret.nom);
  fait();
}

async function demarrer() {
  $("version").textContent = "Version " + APP_VERSION;
  afficherAppartements();
  $("c-signature").value = aujourdhui();
  groupeUnique($("garant"), () => { $("bloc-garant").hidden = !garantOui(); });
  groupeUnique($("duree"));
  ["c-loyer", "c-charges"].forEach((i) => $(i).addEventListener("input", majTotal));
  ["c-prenom", "c-nom", "c-effet"].forEach((i) => $(i).addEventListener("input", majResume));
  $("btn-apercu").onclick = ouvrirApercu;
  $("btn-enregistrer").onclick = enregistrer;
  $("btn-corriger").onclick = fermerApercu;
  try {
    await chargerPages();
    $("chargement").hidden = true;
    $("etape-1").hidden = false;
  } catch (e) {
    console.error(e);
    $("chargement").querySelector("p").textContent = "Le modèle du bail n'a pas pu être chargé. Vérifiez internet, puis fermez et rouvrez l'application.";
  }
}

if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
demarrer();
