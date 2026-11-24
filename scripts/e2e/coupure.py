"""Coupure réseau pendant la fiche : photos hors ligne, page rechargée, retour du réseau. Supabase simulé.
Usage : python3 coupure.py URL"""
import sys, time
from pathlib import Path
from playwright.sync_api import sync_playwright
sys.path.insert(0, str(Path(__file__).parent))
import parcours_commun as c

with sync_playwright() as p:
    b = p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox"])
    ctx = b.new_context(viewport={"width": 800, "height": 1280}, geolocation={"latitude": -4.2635, "longitude": 15.2430},
                        permissions=["geolocation"], locale="fr-FR")
    pg = ctx.new_page(); err = []; pg.on("pageerror", lambda e: err.append(str(e)))
    ctx.route("**/*supabase.co/**", c.route)
    c.connexion_et_arrivee(pg, sys.argv[1])
    photo = str(Path(__file__).with_name("photo_test.jpg"))
    ctx.set_offline(True); pg.evaluate("window.dispatchEvent(new Event('offline'))")
    for cible in ["plaque"]:
        pg.set_input_files("input[type=file]", photo); pg.wait_for_selector("img.vignette")
    pg.click("nav.onglets >> text=5. Clôture")
    for i in range(2):
        pg.locator("input[type=file]").nth(i).set_input_files(photo)
    pg.wait_for_timeout(1500)
    print("bandeau hors ligne :", pg.inner_text(".etat-envoi"))
    pg.reload(wait_until="domcontentloaded") if False else None
    ctx.set_offline(False)
    pg2 = ctx.new_page(); pg2.on("pageerror", lambda e: err.append(str(e)))
    pg.close()
    ctx.set_offline(True)
    pg2.goto(sys.argv[1]); pg2.wait_for_selector(".etat-envoi")
    print("après réouverture hors ligne :", pg2.inner_text(".etat-envoi"))
    ctx.set_offline(False); pg2.evaluate("window.dispatchEvent(new Event('online'))")
    pg2.wait_for_selector("text=Tout est envoyé", timeout=20000)
    print("après retour du réseau :", pg2.inner_text(".etat-envoi"))
    print("photos téléversées :", [(k, v) for k, v in c.objets.items()])
    print("lignes envoyées :", sorted({t for m, t in c.envois}))
    print("erreurs JS :", err)
    b.close()
