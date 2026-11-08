// Aperçu du bail à l'écran : les pages vierges + exactement ce qui a été posé dans le PDF.
// (Un PDF affiché directement sur iPad ne montre souvent que la première page.)
import { NB_PAGES } from "./pdf.js";

const SVG = "http://www.w3.org/2000/svg";
const PT_EN_MM = 25.4 / 72;

function el(nom, attributs) {
  const e = document.createElementNS(SVG, nom);
  Object.entries(attributs).forEach(([k, v]) => e.setAttribute(k, v));
  return e;
}

function dessiner(o) {
  if (o.k === "r") return el("rect", { x: o.x, y: o.y, width: o.l, height: o.h, fill: "#fff" });
  if (o.k === "l") return el("line", { x1: o.x0, y1: o.y0, x2: o.x1, y2: o.y1, stroke: "#000", "stroke-width": o.e });
  if (o.k === "i") return el("image", { href: o.url, x: o.x, y: o.y, width: o.l, height: o.h, preserveAspectRatio: "none" });
  const t = el("text", {
    x: o.x, y: o.y, fill: "#000", "font-size": o.z * PT_EN_MM,
    "font-family": "Helvetica, Arial, sans-serif", "xml:space": "preserve",
  });
  t.textContent = o.t;
  return t;
}

export function afficherApercu(conteneur, journal) {
  conteneur.replaceChildren(...Array.from({ length: NB_PAGES }, (_, i) => {
    const page = document.createElement("div");
    page.className = "page-apercu";
    page.setAttribute("aria-label", `Page ${i + 1} sur ${NB_PAGES}`);
    const img = document.createElement("img");
    img.src = `assets/pages/page${i + 1}.jpg`;
    img.alt = "";
    img.decoding = "async";
    img.loading = i < 2 ? "eager" : "lazy";
    const svg = el("svg", { viewBox: "0 0 210 297" });
    journal.filter((o) => o.p === i + 1).forEach((o) => svg.append(dessiner(o)));
    page.append(img, svg);
    return page;
  }));
}

export function viderApercu(conteneur) {
  conteneur.replaceChildren();
}
