"""Tests de bout en bout (iPad simulé) : formulaire, PDF, cas limites.

Lancer : .venv/bin/python -m pytest -q
Les PDF et les rendus sont écrits dans tests/_sortie/.
"""
import functools
import http.server
import threading
from pathlib import Path

import fitz
import numpy as np
import pytest
from PIL import Image
from playwright.sync_api import sync_playwright

RACINE = Path(__file__).resolve().parent.parent
SORTIE = Path(__file__).resolve().parent / "_sortie"
SORTIE.mkdir(exist_ok=True)


class Silencieux(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass


@pytest.fixture(scope="session")
def url():
    h = functools.partial(Silencieux, directory=str(RACINE))
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), h)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    yield f"http://127.0.0.1:{srv.server_port}/"
    srv.shutdown()


@pytest.fixture(scope="session")
def navigateur():
    with sync_playwright() as p:
        b = p.chromium.launch()
        yield b
        b.close()


@pytest.fixture
def page(navigateur, url):
    ctx = navigateur.new_context(viewport={"width": 820, "height": 1180}, accept_downloads=True, service_workers="block")
    p = ctx.new_page()
    erreurs = []
    p.on("pageerror", lambda e: erreurs.append(str(e)))
    p.goto(url)
    p.wait_for_selector("#etape-1:not([hidden])")
    yield p
    ctx.close()
    assert not erreurs


def remplir(p, prenom="Julie", nom="Martin", effet="2026-09-01", code="MD2", **autres):
    p.click(f'.choix-btn[data-k="{code}"]')
    p.fill("#c-prenom", prenom)
    p.fill("#c-nom", nom)
    p.fill("#c-effet", effet)
    for champ, defaut in [("naissance", "12/03/2001"), ("lieu", "Nîmes"), ("tel", "0612345678"), ("email", "julie@example.com")]:
        autres.setdefault(champ, defaut)
    for champ, valeur in autres.items():
        p.fill(f"#c-{champ}", valeur)


def telecharger(p, nom_sortie):
    p.click("#btn-apercu")
    p.wait_for_selector("#apercu:not([hidden])")
    with p.expect_download() as d:
        p.click("#btn-enregistrer")
    f = SORTIE / nom_sortie
    d.value.save_as(f)
    return d.value.suggested_filename, fitz.open(f), f


def tout_texte(doc):
    return "\n".join(pg.get_text() for pg in doc)


def test_les_trois_appartements_sont_disponibles(page):
    for code in ("MD1", "MD2", "MD3"):
        assert page.is_enabled(f'.choix-btn[data-k="{code}"]')
    assert "Pas encore disponible" not in page.inner_text("#choix-appart")
    assert page.is_hidden("#formulaire")


@pytest.mark.parametrize("code, adresse, pieces, chambres, loyer, total, lettres", [
    ("MD1", "9 rue Jean de Montlaur", "3", "2", "410", "480", "quatre cent dix euros"),
    ("MD2", "11 rue Guillaume d'Autignac — Bâtiment C9", "4", "3", "380", "450", "trois cent quatre-vingts euros"),
    ("MD3", "10 rue Jean Raimond de Comminges", "4", "3", "410", "480", "quatre cent dix euros"),
])
def test_bail_de_chaque_appartement(page, code, adresse, pieces, chambres, loyer, total, lettres):
    remplir(page, code=code)
    nom, doc, _ = telecharger(page, f"bail_{code}.pdf")
    assert nom == f"Bail_{code}_Julie_Martin.pdf"
    assert doc.page_count == 9
    t = tout_texte(doc)
    etage = "2e étage" if code == "MD2" else "4e étage"
    for attendu in [
        adresse, f"{etage} — 34070 Montpellier", f"séjour + {chambres} chambres meublées",
        f"{loyer} € + 70 € de charges = {total} €", f"{loyer} € ({lettres})",
    ]:
        assert attendu in t, attendu
    assert code not in t
    if code != "MD2":
        assert "Bâtiment C9" not in t
    mots_page2 = doc[1].get_text().split()
    assert pieces in mots_page2
    assert {"MD1": "60", "MD2": "72", "MD3": "72"}[code] in mots_page2
    for i in (1, 2):
        doc[i].get_pixmap(dpi=90).save(SORTIE / f"{code}_page{i + 1}.png")


def test_loyer_prerempli(page):
    page.click('.choix-btn[data-k="MD2"]')
    assert page.input_value("#c-loyer") == "380,00"
    assert page.input_value("#c-charges") == "70,00"
    assert page.inner_text("#c-total").replace(" ", " ") == "450,00 €"


def test_bail_complet(page):
    remplir(page, cave="12", email="julie@example.com")
    nom, doc, f = telecharger(page, "bail_md2.pdf")
    assert nom == "Bail_MD2_Julie_Martin.pdf"
    assert doc.page_count == 9
    for pg in doc:
        assert abs(pg.rect.width - 595.28) < 1 and abs(pg.rect.height - 841.89) < 1
    assert f.stat().st_size < 4_000_000
    t = tout_texte(doc)
    for attendu in [
        "CRESP Annie", "SCI CBI", "60 rue Dora Maar", "locationslogements34@gmail.com",
        "Nom et prénom du locataire : Julie MARTIN", "Date et lieu de naissance : 12/03/2001 à Nîmes",
        "Téléphone : 06 12 34 56 78", "Adresse e-mail : julie@example.com",
        "11 rue Guillaume d'Autignac — Bâtiment C9", "2e étage — 34070 Montpellier",
        "Cellier privé", "Cuisine équipée", "01/09/2026", "1 an",
        "380 € + 70 € de charges = 450 €", "380 € (trois cent quatre-vingts euros)",
        "quatre cent cinquante euros", "soixante-dix euros",
        "Réactualisé avec le loyer", "par virement bancaire",
        "Dépôt d'1 mois de loyer (encaissé)", "Toutes fêtes interdites", "Montpellier",
    ]:
        assert attendu in t, attendu
    assert "MD2" not in t
    for i, pg in enumerate(doc):
        pg.get_pixmap(dpi=110).save(SORTIE / f"page{i + 1}.png")


def test_tout_est_ecrit_en_noir(page):
    remplir(page)
    _, doc, _ = telecharger(page, "bail_encre.pdf")
    traits = 0
    for pg in doc:
        for d in pg.get_drawings():
            if d["type"] == "s":
                traits += 1
                assert all(c < 0.01 for c in d["color"]), d
        for bloc in pg.get_text("dict")["blocks"]:
            for l in bloc.get("lines", []):
                for sp in l["spans"]:
                    assert sp["color"] == 0, sp
    assert traits > 40


def test_signature_et_paraphes(page):
    remplir(page)
    _, doc, _ = telecharger(page, "bail_signe.pdf")
    # image de fond + paraphe sur chaque page ; + signature sur la dernière
    assert [len(pg.get_image_info()) for pg in doc] == [2] * 8 + [3]


def test_apercu_avant_enregistrement(page):
    remplir(page, cave="12")
    page.on("download", lambda d: pytest.fail("téléchargement sans enregistrer"))
    page.click("#btn-apercu")
    page.wait_for_selector("#apercu:not([hidden])")
    assert page.locator(".page-apercu").count() == 9
    assert page.locator(".page-apercu img").count() == 9
    assert page.locator(".page-apercu").nth(1).locator("text=Julie MARTIN").count() == 1
    assert page.locator(".page-apercu").nth(8).locator("svg image").count() == 2
    page.wait_for_function("[...document.querySelectorAll('.page-apercu img')].slice(0,3).every(i => i.complete && i.naturalWidth > 0)")
    page.screenshot(path=str(SORTIE / "apercu.png"))
    page.locator(".page-apercu").nth(8).scroll_into_view_if_needed()
    page.wait_for_timeout(300)
    page.screenshot(path=str(SORTIE / "apercu_p9.png"))
    page.click("#btn-retour")
    assert page.is_hidden("#apercu")
    assert page.input_value("#c-prenom") == "Julie"
    assert page.locator(".page-apercu").count() == 0


def test_apercu_refuse_si_incomplet(page):
    page.click('.choix-btn[data-k="MD2"]')
    page.click("#btn-apercu")
    assert page.is_hidden("#apercu")
    assert "prénom" in page.inner_text("#message")


def test_correction_prise_en_compte(page):
    remplir(page)
    page.click("#btn-apercu")
    page.click("#btn-retour")
    page.fill("#c-nom", "Durand")
    nom, doc, _ = telecharger(page, "bail_corrige.pdf")
    assert nom == "Bail_MD2_Julie_Durand.pdf"
    assert "Julie DURAND" in doc[1].get_text()


def test_injection_dans_apercu_reste_du_texte(page):
    remplir(page, prenom="<img src=x onerror=alert(1)>")
    page.click("#btn-apercu")
    assert page.locator(".page-apercu svg img").count() == 0


def test_garant_et_montants_modifies(page):
    remplir(page, loyer="1 234,50", charges="65")
    page.click("#garant-oui")
    page.fill("#c-garant-nom", "Paul Durand")
    page.fill("#c-garant-adresse", "3 place de la Comédie")
    page.fill("#c-garant-cp", "34000")
    page.fill("#c-garant-ville", "Montpellier")
    page.click('#duree button[data-duree^="9 mois"]')
    _, doc, _ = telecharger(page, "bail_garant.pdf")
    t = tout_texte(doc)
    assert "Paul Durand — 3 place de la Comédie, 34000 Montpellier" in t
    doc[1].get_pixmap(dpi=110).save(SORTIE / "garant_page2.png")
    assert "9 mois (location consentie à un étudiant)" in t
    assert "1 234,50 € + 65 € de charges = 1 299,50 €" in t
    assert "mille deux cent trente-quatre euros et cinquante centimes" in t


@pytest.mark.parametrize("adresse,cp,ville,attendu,champ", [
    ("", "34000", "Montpellier", "numéro et rue", "adresse"),
    ("3 place de la Comédie", "", "Montpellier", "code postal", "cp"),
    ("3 place de la Comédie", "Montpellier", "Montpellier", "code postal", "cp"),
    ("3 place de la Comédie", "34000", "", "ville", "ville"),
])
def test_adresse_du_garant_complete_exigee(page, adresse, cp, ville, attendu, champ):
    remplir(page)
    page.click("#garant-oui")
    page.fill("#c-garant-nom", "Paul Durand")
    page.fill("#c-garant-adresse", adresse)
    page.fill("#c-garant-cp", cp)
    page.fill("#c-garant-ville", ville)
    page.click("#btn-apercu")
    assert page.is_hidden("#apercu")
    assert attendu in page.inner_text("#message")
    assert "invalide" in page.get_attribute(f"#c-garant-{champ}", "class")


def test_precedent_du_navigateur_revient_au_formulaire(page):
    remplir(page)
    adresse = page.url
    page.click("#btn-apercu")
    page.wait_for_selector("#apercu:not([hidden])")
    page.go_back()
    page.wait_for_selector("#apercu", state="hidden")
    assert page.url == adresse
    assert page.input_value("#c-prenom") == "Julie"
    assert page.is_visible("#btn-apercu")


def test_nouveau_bail_repart_de_zero(page):
    remplir(page, cave="12")
    page.click("#garant-oui")
    page.fill("#c-garant-nom", "Paul Durand")
    assert page.is_visible("#btn-apercu")
    page.click("#garant-non")
    telecharger(page, "bail_avant_nouveau.pdf")
    assert page.is_hidden("#btn-enregistrer")
    page.click("#btn-nouveau")
    page.wait_for_selector("#apercu", state="hidden")
    assert page.is_hidden("#formulaire")
    assert page.locator(".choix-btn.choisi").count() == 0
    assert page.input_value("#c-prenom") == "" and page.input_value("#c-garant-nom") == ""
    assert page.input_value("#c-signature") != ""
    remplir(page, code="MD1", prenom="Léa", nom="Petit")
    nom, _, _ = telecharger(page, "bail_apres_nouveau.pdf")
    assert nom == "Bail_MD1_Léa_Petit.pdf" or nom == "Bail_MD1_Lea_Petit.pdf"


def test_pas_d_encadre_a_joindre(page):
    remplir(page)
    telecharger(page, "bail_sans_encadre.pdf")
    texte = page.inner_text("body")
    assert "À joindre" not in texte and "DPE" not in texte
    assert page.is_visible("#btn-nouveau")
    page.screenshot(path=str(SORTIE / "apres_enregistrement.png"))


@pytest.mark.parametrize("champ,valeur,attendu", [
    ("naissance", "", "date de naissance"), ("naissance", "31/02/2001", "pas lisible"),
    ("naissance", "12/03/2999", "pas lisible"), ("lieu", "", "lieu de naissance"),
    ("tel", "", "téléphone"), ("tel", "appeler", "pas lisible"),
    ("email", "", "e-mail"), ("email", "julie", "incomplète"),
])
def test_coordonnees_du_locataire_exigees(page, champ, valeur, attendu):
    remplir(page, **{champ: valeur})
    page.click("#btn-apercu")
    assert page.is_hidden("#apercu")
    assert attendu in page.inner_text("#message")
    assert "invalide" in page.get_attribute(f"#c-{champ}", "class")


def test_date_de_naissance_sans_barres(page):
    remplir(page, naissance="12032001", tel="+32 470 12 34 56")
    _, doc, _ = telecharger(page, "bail_coordonnees.pdf")
    t = doc[1].get_text()
    assert "12/03/2001 à Nîmes" in t and "+32 470 12 34 56" in t


def test_ancien_bloc_locataire_retire_du_modele():
    im = np.asarray(Image.open(RACINE / "assets/pages/page2.jpg").convert("L"))
    assert (im[484:580, 140:1500] < 140).sum() == 0, "ancien libellé ou pointillés encore présents"
    assert (im[642:678, 100:1500] < 140).sum() > 500, "« Désigné » n'a pas été descendu"


def test_clause_resolutoire_reecrite_dans_le_modele():
    im = np.asarray(Image.open(RACINE / "assets/pages/page6.jpg").convert("L"))
    # L'ancienne deuxième ligne ne contenait que « charge » ; la nouvelle va bien au-delà.
    assert (im[1940:1960, 400:560] < 140).sum() > 200
    # Rien ne dépasse à droite ni ne touche le trait des notes.
    assert (im[1905:1975, 1440:1500] < 140).sum() == 0


def test_mode_de_charges_non_coche(page):
    remplir(page)
    _, doc, _ = telecharger(page, "bail_charges.pdf")
    echelle = 595.28 / 1654
    case = fitz.Rect(106, 1351, 139, 1383) * fitz.Matrix(echelle, echelle)
    assert not [d for d in doc[3].get_drawings() if d["rect"].intersects(case)]


def test_garant_abandonne_non_imprime(page):
    remplir(page)
    page.click("#garant-oui")
    page.fill("#c-garant-nom", "Paul Durand")
    page.click("#garant-non")
    _, doc, _ = telecharger(page, "bail_sans_garant.pdf")
    assert "Paul Durand" not in tout_texte(doc)


@pytest.mark.parametrize("champ,attendu", [
    ("prenom", "prénom"), ("nom", "nom"), ("effet", "date d'entrée"),
])
def test_champ_obligatoire(page, champ, attendu):
    v = dict(prenom="Julie", nom="Martin", effet="2026-09-01")
    v[champ] = ""
    remplir(page, **v)
    page.click("#btn-apercu")
    assert attendu in page.inner_text("#message")
    assert "invalide" in page.get_attribute(f"#c-{champ}", "class")


def test_loyer_illisible(page):
    remplir(page, loyer="beaucoup")
    page.click("#btn-apercu")
    assert "loyer" in page.inner_text("#message").lower()


def test_noms_tres_longs_restent_dans_la_page(page):
    remplir(page, prenom="Marie-Christine Anne-Sophie Eugénie", nom="de La Rochefoucauld-Montbel d'Alexandrovitch",
            email="marie.christine.de.la.rochefoucauld.montbel@un-domaine-tres-long.example.com")
    _, doc, _ = telecharger(page, "bail_long.pdf")
    assert "Rochefoucauld" in doc[1].get_text().replace("\n", " ").title() or "ROCHEFOUCAULD" in doc[1].get_text()
    for mot in doc[1].get_text("words"):
        assert mot[2] <= 595 - 20, mot
    doc[1].get_pixmap(dpi=110).save(SORTIE / "long_page2.png")


def test_accents_et_lettres_hors_alphabet(page):
    remplir(page, prenom="Çağla Łucja", nom="Müller-Nguyễn Cœur")
    _, doc, _ = telecharger(page, "bail_accents.pdf")
    t = doc[1].get_text()
    assert "Lucja" in t and "Ça" in t
    assert "MÜLLER" in t and "CŒUR" in t


def test_rien_n_est_conserve(page):
    remplir(page)
    telecharger(page, "bail_rien.pdf")
    assert page.evaluate("localStorage.length + sessionStorage.length") == 0
    page.reload()
    page.wait_for_selector("#etape-1:not([hidden])")
    assert page.is_hidden("#formulaire")
    assert page.input_value("#c-prenom") == ""


def test_ipad_ouvre_le_menu_enregistrer(navigateur, url):
    ua = "Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1"
    ctx = navigateur.new_context(viewport={"width": 820, "height": 1180}, user_agent=ua, service_workers="block")
    ctx.add_init_script("""
      window.__partages = [];
      navigator.canShare = () => true;
      navigator.share = (d) => { window.__partages.push(d.files[0].name); return Promise.resolve(); };
    """)
    p = ctx.new_page()
    p.goto(url)
    p.wait_for_selector("#etape-1:not([hidden])")
    remplir(p)
    p.click("#btn-apercu")
    p.click("#btn-enregistrer")
    p.wait_for_selector(".message.ok")
    assert p.evaluate("window.__partages") == ["Bail_MD2_Julie_Martin.pdf"]
    assert p.is_visible("#btn-nouveau")
    ctx.close()


def test_ipad_annulation(navigateur, url):
    ua = "Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1"
    ctx = navigateur.new_context(viewport={"width": 820, "height": 1180}, user_agent=ua, service_workers="block")
    ctx.add_init_script("""
      navigator.canShare = () => true;
      navigator.share = () => Promise.reject(new DOMException("x", "AbortError"));
    """)
    p = ctx.new_page()
    p.goto(url)
    p.wait_for_selector("#etape-1:not([hidden])")
    remplir(p)
    p.click("#btn-apercu")
    p.click("#btn-enregistrer")
    p.wait_for_selector(".message.info:has-text('Rien n')")
    assert p.is_visible("#btn-enregistrer") and p.is_hidden("#btn-nouveau")
    ctx.close()


def test_gros_boutons_et_gros_texte(page):
    page.click('.choix-btn[data-k="MD2"]')
    tailles = page.evaluate("""() => [...document.querySelectorAll('input,button,label,p,h2')]
      .filter(e => e.offsetParent).map(e => ({t: e.tagName, f: parseFloat(getComputedStyle(e).fontSize), h: e.offsetHeight}))""")
    assert all(x["f"] >= 18 for x in tailles)
    assert all(x["h"] >= 56 for x in tailles if x["t"] in ("INPUT", "BUTTON"))
    assert page.evaluate("document.documentElement.scrollWidth <= innerWidth")
    page.screenshot(path=str(SORTIE / "ecran.png"), full_page=True)


def test_hors_ligne(navigateur, url):
    ctx = navigateur.new_context(viewport={"width": 820, "height": 1180}, accept_downloads=True)
    p = ctx.new_page()
    p.goto(url)
    p.wait_for_selector("#etape-1:not([hidden])")
    p.evaluate("navigator.serviceWorker.ready.then(() => true)")
    p.wait_for_function("navigator.serviceWorker.controller !== null")
    ctx.set_offline(True)
    p.reload()
    p.wait_for_selector("#etape-1:not([hidden])")
    remplir(p)
    p.click("#btn-apercu")
    with p.expect_download():
        p.click("#btn-enregistrer")
    ctx.close()
