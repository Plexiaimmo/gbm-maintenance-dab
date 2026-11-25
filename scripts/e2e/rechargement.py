"""Recharger la page pendant une fiche (tirer pour actualiser, mise à jour) : on reste sur la fiche, même rubrique.
Usage : python3 rechargement.py URL"""
import sys
from playwright.sync_api import sync_playwright
import parcours_commun as c

with sync_playwright() as p:
    b = p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox"])
    ctx = b.new_context(viewport={"width": 800, "height": 1280}, geolocation={"latitude": -4.2635, "longitude": 15.243},
                        permissions=["geolocation"], locale="fr-FR")
    ctx.route("**/*supabase.co/**", c.route)
    pg = ctx.new_page(); err = []; pg.on("pageerror", lambda e: err.append(str(e)))
    c.connexion_et_arrivee(pg, sys.argv[1])
    pg.click("button.rail-etape:has-text('Mécanique')"); pg.wait_for_selector("#module-Lecteur de cartes, article.point")
    avant = pg.inner_text("article.point h3")
    # Le geste « tirer pour actualiser » est bloqué par le style de la page
    blocage = pg.evaluate("getComputedStyle(document.documentElement).overscrollBehaviorY")
    pg.reload(); pg.wait_for_selector("article.point"); pg.wait_for_timeout(800)
    apres = pg.inner_text("article.point h3")
    sur_fiche = pg.query_selector(".fiche") is not None and pg.query_selector(".tournee") is None
    actif = pg.inner_text("button.rail-etape[aria-current=step]")
    print("overscroll racine :", blocage)
    print("toujours sur la fiche :", sur_fiche, "| rubrique active :", actif.split()[0], "| même 1er module :", avant == apres)
    # Déconnexion : plus rien n'est mémorisé
    print("erreurs JS :", err); b.close()
    assert blocage == "none" and sur_fiche and "Mécanique" in actif and avant == apres, "KO"
    print("OK")
